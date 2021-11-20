# Flakeaway

Flakeaway is a simple CI server for [Nix flakes](https://nixos.wiki/wiki/Flakes).

## Self-hosted

You can run Flakeaway on your own server which will be used to build Flake
outputs and publish the results on GitHub.

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
