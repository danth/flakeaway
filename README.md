# Flakeaway

Flakeaway is a simple CI server for [Nix flakes](https://nixos.wiki/wiki/Flakes).

## Self-hosted setup

You can run Flakeaway on your own server which will be used to evaluate jobs,
build them and then publish the results on GitHub.

Add the flake `github:danth/flakeaway` to your system configuration, and import
`nixosModules.flakeaway` from it.

Set `services.flakeaway.enable` to `true` to enable the service.

### Exposing the API

Flakeaway runs a HTTP server on port `15345` to handle API requests and
webhooks. You should proxy this over HTTPS for extra security. Here is an
example setup using Nginx:

```nix
{
   security.acme = {
      defaults.email = "someone@example.com";

      # Read the terms at https://letsencrypt.org/repository/
      acceptTerms = true;
   };

   services.nginx = {
     enable = true;

     virtualHosts."flakeaway.example.com" = {
       enableACME = true;
       forceSSL = true;
       locations."/".proxyPass = "http://localhost:15345";
     };
   };

   networking.firewall.allowedTCPPorts = [ 80 443 ];
}
```

### GitHub

Register a new GitHub app by following [these instructions][create-github-app].

The following permissions are required on the app:
- Checks: write
- Contents: read
- Metadata: read

Enable webhooks for these events:
- Check run
- Check suite

Set the webhook URL to `https://flakeaway.example.com/api/github/webhooks`.

Set these NixOS options to the corresponding values from the app configuration
page:

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

[create-github-app]: https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app

### Further configuration

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
