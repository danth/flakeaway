self:
{ pkgs, config, lib, ... }:

with lib;

let
  cfg = config.services.flakeaway;
  inherit (self.packages.${pkgs.system}) flakeaway-server flakeaway-evaluator;

in {
  options.services.flakeaway = {
    enable = mkEnableOption "Flakeaway CI server";

    github = {
      appId = mkOption {
        description = ''
          App ID.
          This is provided by GitHub on the app configuration page.
        '';
        type = types.str;
      };

      clientId = mkOption {
        description = ''
          Client ID.
          This is provided by GitHub on the app configuration page.
        '';
        type = types.str;
      };

      clientSecret = mkOption {
        description = ''
          Client secret.
          You can generate this on the GitHub app configuration page.
        '';
        type = types.str;
      };

      privateKeyFile = mkOption {
        description = ''
          Path to a file containing the private key.
          You can generate this on the GitHub app configuration page.
        '';
        type = types.path;
      };

      webhookSecret = mkOption {
        description = ''
          Secret used to secure webhooks as coming from GitHub.
          You must set this to the same value on the GitHub app configuration
          page.
        '';
        type = types.str;
      };

      allowedUsers = mkOption {
        description = ''
          List of user / organisation names which are allowed to access this
          Flakeaway instance.
        '';
        type = with types; nullOr (listOf str);
        default = null;
        defaultText = "Anyone has access.";
      };
    };

    concurrency = {
      evaluation = mkOption {
        description = "Number of evaluation jobs to run in parallel.";
        type = types.int;
        default = 1;
      };

      build = mkOption {
        description = "Number of builds to run in parallel.";
        type = types.int;
        default = 1;
      };
    };

    evaluator = {
      workers = mkOption {
        description = "Number of parallel workers within each evaluation job.";
        type = types.int;
        default = 1;
      };

      workerMemory = mkOption {
        description = "Maximum memory consumption of a single worker process, in MiB.";
        type = types.int;
        default = 2048;
      };
    };

    stores = {
      build = mkOption {
        description = ''
          Remote store used during the build itself.

          By default, builds run on the same machine as Flakeaway.
          A remote store is one way to offload building to another machine.
          See https://docs.nixbuild.net/remote-builds/#using-remote-stores
          for an example of how this works.

          Setting a remote store will prevent garbage collection roots from
          being created.

          Note that <literal>--eval-store</literal> is always set to
          <literal>auto</literal>, so the store of the Flakeaway server
          will still be used during the evaluation phase.
        '';
        type = types.str;
        default = "auto";
        example = "ssh-ng://builder.example.com";
      };

      output = mkOption {
        description = ''
          Remote stores to which finished packages will be uploaded.

          Adding at least one remote store will prevent garbage collection
          roots from being created in the local Nix store.
        '';
        type = with types; listOf str;
        default = [];
        example = [ "s3://nix-cache?profile=nix-cache&endpoint=cache.example.com" ];
      };
    };
  };

  config = mkIf cfg.enable {
    assertions = [
      {
        assertion = with builtins;
          elem "*" config.nix.settings.allowed-users
          || elem "flakeaway" config.nix.settings.allowed-users
          || elem "@flakeaway" config.nix.settings.allowed-users;
        message =
          "The user `flakeaway` must be allowed to access the Nix daemon.";
      }
      {
        assertion = versionAtLeast pkgs.nix.version "2.4";
        message = "Flakeaway requires at least Nix version 2.4.";
      }
    ];

    nix.settings.experimental-features = [ "nix-command" "flakes" ];

    users = {
      users.flakeaway = {
        isSystemUser = true;
        home = "/var/lib/flakeaway";
        createHome = true;
        group = "flakeaway";
      };
      groups.flakeaway = { };
    };

    services.redis.servers.flakeaway = {
      enable = true;
      user = "flakeaway";
    };

    systemd.services.flakeaway = {
      description = "Flakeaway CI server";

      wants = [ "network-online.target" "nix-daemon.service" "redis-flakeaway.service" ];
      after = [ "network-online.target" "nix-daemon.service" "redis-flakeaway.service" ];
      wantedBy = [ "default.target" ];

      path = with pkgs; [ cachix gitMinimal openssh openssl nix flakeaway-evaluator ];

      preStart = ''
        if [ ! -f secrets_private_key.pem ]; then
          openssl genrsa -out secrets_private_key.pem 2048
        fi
        if [ ! -f secrets_public_key.pem ]; then
          openssl rsa -pubout -in secrets_private_key.pem -out secrets_public_key.pem
        fi
      '';

      environment = {
        GITHUB_APP_ID = cfg.github.appId;
        GITHUB_CLIENT_ID = cfg.github.clientId;
        GITHUB_CLIENT_SECRET = cfg.github.clientSecret;
        GITHUB_PRIVATE_KEY_FILE = cfg.github.privateKeyFile;
        GITHUB_WEBHOOK_SECRET = cfg.github.webhookSecret;
        REDIS = config.services.redis.servers.flakeaway.unixSocket;
        EVALUATION_CONCURRENCY = toString cfg.concurrency.evaluation;
        BUILD_CONCURRENCY = toString cfg.concurrency.build;
        EVALUATOR_WORKERS = toString cfg.evaluator.workers;
        EVALUATOR_WORKER_MEMORY = toString cfg.evaluator.workerMemory;
        BUILD_STORE = cfg.stores.build;
        OUTPUT_STORES = builtins.toJSON (map (store: {
          type = "basic";
          inherit store;
        }) cfg.stores.output);
      } // (optionalAttrs (!isNull cfg.github.allowedUsers) {
        GITHUB_ALLOWED_USERS = concatStringsSep "," cfg.github.allowedUsers;
      });

      serviceConfig = {
        WorkingDirectory = "/var/lib/flakeaway";
        User = "flakeaway";
        Group = "flakeaway";

        ExecStart = "${flakeaway-server}/bin/flakeaway-server";

        Restart = "on-failure";

        # Flakeaway will finish the current builds before stopping
        TimeoutStopSec = "infinity";
        # Only send SIGTERM to the main process, not child processes
        KillMode = "mixed";
      };
    };

    systemd.tmpfiles.rules = [ "d /var/lib/flakeaway/.cache - flakeaway flakeaway 7d -" ];
  };
}
