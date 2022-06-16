# Flakeaway

Flakeaway is a simple CI server for [Nix flakes](https://nixos.wiki/wiki/Flakes).

## Not maintained

Since writing Flakeaway, I've started using [nixbuild.net](https://nixbuild.net/)
and their GitHub actions workflow. This allows me to save money by only paying for
the builds I actually use, rather than a permanent server.

Hence I will not be maintaining this repository from now on.

However, I do think that Flakeaway had some potential behind it. If someone wants to
work on this, please do let me know and I'll be happy to give you access / transfer
the repository.

## Self-hosted setup

You can run Flakeaway on your own server which will be used to evaluate jobs,
build them and then publish the results on GitHub.

1. Register a new GitHub app by following [these instructions][create-github-app].

   Set the webhook URL to `http://your-host.example.com:15345/api/github/webhooks`.

2. Add the flake `github:danth/flakeaway` to your system configuration, and
   import the NixOS module which is exported as `nixosModules.flakeaway`.

3. Set these NixOS options to the corresponding values from the app
   configuration page:

   - `services.flakeaway.appId`
   - `services.flakeaway.clientId`
   - `services.flakeaway.clientSecret`
   - `services.flakeaway.privateKeyFile`
   - `services.flakeaway.webhookSecret`

   All of the options are simple strings, except `privateKeyFile` which should
   be a path to the file somewhere on your server. Take care not to store the
   private key unencrypted in the Nix store as that will make it readable to
   all users; if you run a binary cache server alongside Flakeaway, then it
   could also be accessed by anyone on the Internet.

4. Set `services.flakeaway.enable` to `true` to enable the service.

[create-github-app]: https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app

## Further configuration

You can set `services.flakeaway.allowedUsers` to a list of user / organisation names
in order to limit use of your instance to only those accounts.

Use the options under `services.flakeaway.concurrency` to control how many evaluations
and builds can be running at the same time. By default, there will only be one of each.

Set `services.flakeaway.evaluator.workers` to a value greater than one to use multiple
processes per evaluation job. This means that individual outputs can be evaluated in
parallel. You can use `services.flakeaway.evaluator.workerMemory` to limit the amount
of memory which a single process can consume before it will be reset. By default this
is set to 2GiB. Higher values will evaluate faster because more information can be cached
in memory.
