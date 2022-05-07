#include <map>
#include <iostream>
#include <thread>

#include <nix/config.h>
#include <nix/shared.hh>
#include <nix/store-api.hh>
#include <nix/eval.hh>
#include <nix/eval-inline.hh>
#include <nix/util.hh>
#include <nix/get-drvs.hh>
#include <nix/globals.hh>
#include <nix/common-eval-args.hh>
#include <nix/flake/flakeref.hh>
#include <nix/flake/flake.hh>
#include <nix/attr-path.hh>
#include <nix/derivations.hh>
#include <nix/local-fs-store.hh>
#include <nix/logging.hh>
#include <nix/error.hh>

#include <nix/value-to-json.hh>

#include <sys/types.h>
#include <sys/wait.h>
#include <sys/resource.h>

#include <nlohmann/json.hpp>

using namespace nix;
using namespace nlohmann;

// Safe to ignore - the args will be static.
#ifdef __GNUC__
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#elif __clang__
#pragma clang diagnostic ignored "-Wnon-virtual-dtor"
#endif
struct MyArgs : MixEvalArgs, MixCommonArgs {
    std::string flakeRef;
    size_t nrWorkers = 1;
    size_t maxMemorySize = 2048;

    MyArgs() : MixCommonArgs("nix-eval-jobs") {
        addFlag({
            .longName = "help",
            .description = "Show usage information.",
            .handler = {[&]() {
                printf("USAGE: nix-eval-jobs [options] expr\n\n");
                for (const auto &[name, flag] : longFlags) {
                    if (hiddenCategories.count(flag->category)) {
                        continue;
                    }
                    printf("  --%-20s %s\n", name.c_str(),
                           flag->description.c_str());
                }
                ::exit(0);
            }},
        });

        addFlag(
            {.longName = "workers",
             .description = "Number of evaluation workers.",
             .labels = {"workers"},
             .handler = {[=](std::string s) { nrWorkers = std::stoi(s); }}});

        addFlag({.longName = "max-memory-size",
                 .description = "Maximum memory usage per evaluation worker.",
                 .labels = {"size"},
                 .handler = {
                     [=](std::string s) { maxMemorySize = std::stoi(s); }}});

        expectArg("flake", &flakeRef);
    }
};
#ifdef __GNUC__
#pragma GCC diagnostic ignored "-Wnon-virtual-dtor"
#elif __clang__
#pragma clang diagnostic ignored "-Wnon-virtual-dtor"
#endif

static MyArgs myArgs;

static Value *topLevelValue(EvalState &state, Bindings &autoArgs) {
    using namespace flake;

    FlakeRef flakeRef = parseFlakeRef(myArgs.flakeRef);

    auto vFlake = state.allocValue();

    auto lockedFlake = lockFlake(state, flakeRef,
                                 LockFlags{
                                     .updateLockFile = false,
                                     .useRegistries = false,
                                     .allowMutable = false,
                                 });

    callFlake(state, lockedFlake, *vFlake);

    auto vOutputs = vFlake->attrs->get(state.symbols.create("outputs"))->value;
    state.forceValue(*vOutputs, noPos);

    auto vRoot = state.allocValue();
    state.autoCallFunction(autoArgs, *vOutputs, *vRoot);

    return vRoot;
}

/* The fields of a derivation that are printed in json form */
struct Drv {
    std::string name;
    std::string system;
    std::string drvPath;

    Drv(EvalState &state, DrvInfo &drvInfo) {
        name = drvInfo.queryName();

        if (drvInfo.querySystem() == "unknown")
            throw EvalError("derivation must have a 'system' attribute");
        system = drvInfo.querySystem();

        auto localStore = state.store.dynamic_pointer_cast<LocalFSStore>();
        drvPath = localStore->printStorePath(drvInfo.requireDrvPath());
    }
};

static void to_json(nlohmann::json &json, const Drv &drv) {
    json = nlohmann::json{
        {"name", drv.name},
        {"system", drv.system},
        {"drvPath", drv.drvPath},
    };
}

std::string attrPathJoin(json input) {
    return std::accumulate(input.begin(), input.end(), std::string(),
                           [](std::string ss, std::string s) {
                               // Escape token if containing dots
                               if (s.find(".") != std::string::npos) {
                                   s = "\"" + s + "\"";
                               }
                               return ss.empty() ? s : ss + "." + s;
                           });
}

static void worker(EvalState &state, Bindings &autoArgs, AutoCloseFD &to,
                   AutoCloseFD &from) {
    auto vRoot = topLevelValue(state, autoArgs);

    while (true) {
        /* Wait for the collector to send us a job name. */
        writeLine(to.get(), "next");

        auto s = readLine(from.get());
        if (s == "exit")
            break;
        if (!hasPrefix(s, "do "))
            abort();
        json path = json::parse(s.substr(3));
        auto attrPathS = attrPathJoin(path);

        debug("worker process %d at '%s'", getpid(), path);

        /* Evaluate it and send info back to the collector. */
        json reply = json{{"attr", attrPathS}, {"attrPath", path}};
        try {
            auto vTmp =
                findAlongAttrPath(state, attrPathS, autoArgs, *vRoot).first;

            auto v = state.allocValue();
            state.autoCallFunction(autoArgs, *vTmp, *v);

            if (auto drvInfo = getDerivation(state, *v, false)) {
                auto drv = Drv(state, *drvInfo);
                reply.update(drv);
            }

            else if (v->type() == nAttrs) {
                bool recurse =
                    path.size() == 0 ||
                    (path[0] == "packages" && path.size() < 3) ||
                    (path[0] == "checks" && path.size() < 3) ||
                    (path[0] == "nixosConfigurations" && path.size() < 2);

                if (recurse) {
                    auto attrs = nlohmann::json::array();
                    for (auto &i : v->attrs->lexicographicOrder()) {
                        std::string name(i->name);
                        attrs.push_back(name);
                    }
                    reply["attrs"] = std::move(attrs);
                }
                else if (path[0] == "nixosConfigurations" && path.size() == 2)
                    reply["attrs"] = nlohmann::json::array({"config"});
                else if (path[0] == "nixosConfigurations" && path.size() == 3)
                    reply["attrs"] = nlohmann::json::array({"system"});
                else if (path[0] == "nixosConfigurations" && path.size() == 4)
                    reply["attrs"] = nlohmann::json::array({"build"});
                else if (path[0] == "nixosConfigurations" && path.size() == 5)
                    reply["attrs"] = nlohmann::json::array({"toplevel"});
                else
                    reply["attrs"] = nlohmann::json::array();
            }
        } catch (EvalError &e) {
            printError(e.msg());

            auto err = e.info();

            std::ostringstream oss;
            showErrorInfo(oss, err, loggerSettings.showTrace.get());
            auto msg = oss.str();

            reply["error"] = filterANSIEscapes(msg, true);
        }

        writeLine(to.get(), reply.dump());

        /* If our RSS exceeds the maximum, exit. The collector will
           start a new process. */
        struct rusage r;
        getrusage(RUSAGE_SELF, &r);
        if ((size_t)r.ru_maxrss > myArgs.maxMemorySize * 1024)
            break;
    }

    writeLine(to.get(), "restart");
}

typedef std::function<void(EvalState &state, Bindings &autoArgs,
                           AutoCloseFD &to, AutoCloseFD &from)>
    Processor;

/* Auto-cleanup of fork's process and fds. */
struct Proc {
    AutoCloseFD to, from;
    Pid pid;

    Proc(const Processor &proc) {
        Pipe toPipe, fromPipe;
        toPipe.create();
        fromPipe.create();
        auto p = startProcess(
            [&,
             to{std::make_shared<AutoCloseFD>(std::move(fromPipe.writeSide))},
             from{
                 std::make_shared<AutoCloseFD>(std::move(toPipe.readSide))}]() {
                debug("created worker process %d", getpid());
                try {
                    EvalState state(myArgs.searchPath, openStore());
                    Bindings &autoArgs = *myArgs.getAutoArgs(state);
                    proc(state, autoArgs, *to, *from);
                } catch (Error &e) {
                    auto msg = e.msg();
                    printError(msg);

                    nlohmann::json err;
                    err["error"] = filterANSIEscapes(msg, true);
                    writeLine(to->get(), err.dump());

                    writeLine(to->get(), "restart");
                }
            },
            ProcessOptions{.allowVfork = false});

        to = std::move(toPipe.writeSide);
        from = std::move(fromPipe.readSide);
        pid = p;
    }

    ~Proc() {}
};

struct State {
    std::set<json> todo = json::array({json::array()});
    std::set<json> active;
    std::exception_ptr exc;
};

std::function<void()> collector(Sync<State> &state_,
                                std::condition_variable &wakeup) {
    return [&]() {
        try {
            std::optional<std::unique_ptr<Proc>> proc_;

            while (true) {

                auto proc = proc_.has_value() ? std::move(proc_.value())
                                              : std::make_unique<Proc>(worker);

                /* Check whether the existing worker process is still there. */
                auto s = readLine(proc->from.get());
                if (s == "restart") {
                    proc_ = std::nullopt;
                    continue;
                } else if (s != "next") {
                    auto json = json::parse(s);
                    throw Error("worker error: %s", (std::string)json["error"]);
                }

                /* Wait for a job name to become available. */
                json attrPath;

                while (true) {
                    checkInterrupt();
                    auto state(state_.lock());
                    if ((state->todo.empty() && state->active.empty()) ||
                        state->exc) {
                        writeLine(proc->to.get(), "exit");
                        return;
                    }
                    if (!state->todo.empty()) {
                        attrPath = *state->todo.begin();
                        state->todo.erase(state->todo.begin());
                        state->active.insert(attrPath);
                        break;
                    } else
                        state.wait(wakeup);
                }

                /* Tell the worker to evaluate it. */
                writeLine(proc->to.get(), "do " + attrPath.dump());

                /* Wait for the response. */
                auto respString = readLine(proc->from.get());
                auto response = json::parse(respString);

                /* Handle the response. */
                std::vector<json> newAttrs;
                if (response.find("attrs") != response.end()) {
                    for (auto &i : response["attrs"]) {
                        json newAttr = json(response["attrPath"]);
                        newAttr.emplace_back(i);
                        newAttrs.push_back(newAttr);
                    }
                } else if (
                    response.find("drvPath") != response.end() ||
                    response.find("error") != response.end()
                ) {
                    auto state(state_.lock());
                    std::cout << respString << "\n" << std::flush;
                }

                proc_ = std::move(proc);

                /* Add newly discovered job names to the queue. */
                {
                    auto state(state_.lock());
                    state->active.erase(attrPath);
                    for (auto p : newAttrs) {
                        state->todo.insert(p);
                    }
                    wakeup.notify_all();
                }
            }
        } catch (...) {
            auto state(state_.lock());
            state->exc = std::current_exception();
            wakeup.notify_all();
        }
    };
}

int main(int argc, char **argv) {
    /* We are doing the garbage collection by killing forks */
    setenv("GC_DONT_GC", "1", 1);

    return handleExceptions(argv[0], [&]() {
        initNix();
        initGC();

        myArgs.parseCmdline(argvToStrings(argc, argv));

        /* FIXME: The build hook in conjunction with import-from-derivation is
         * causing "unexpected EOF" during eval */
        settings.builders = "";

        evalSettings.restrictEval = false;
        evalSettings.pureEval = true;

        Sync<State> state_;

        /* Start a collector thread per worker process. */
        std::vector<std::thread> threads;
        std::condition_variable wakeup;
        for (size_t i = 0; i < myArgs.nrWorkers; i++)
            threads.emplace_back(std::thread(collector(state_, wakeup)));

        for (auto &thread : threads)
            thread.join();

        auto state(state_.lock());

        if (state->exc)
            std::rethrow_exception(state->exc);
    });
}
