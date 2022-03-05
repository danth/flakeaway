self:
{ pkgs, config, lib, ... }:

with lib;

let
  cfg = config.services.flakeaway;
  inherit (self.packages.${pkgs.system}) flakeaway;

in {
  options.services.flakeaway = {
    enable = mkEnableOption "Flakeaway CI server";

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

  config = mkIf cfg.enable {
    assertions = [
      {
        assertion = with builtins;
          elem "*" config.nix.allowedUsers
          || elem "flakeaway" config.nix.allowedUsers
          || elem "@flakeaway" config.nix.allowedUsers;
        message =
          "The user `flakeaway` must be allowed to access the Nix daemon.";
      }
      {
        assertion = versionAtLeast pkgs.nix.version "2.4";
        message = "Flakeaway requires at least Nix version 2.4.";
      }
    ];

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

      path = with pkgs; [ gitMinimal nix ];

      environment = {
        APP_ID = cfg.appId;
        CLIENT_ID = cfg.clientId;
        CLIENT_SECRET = cfg.clientSecret;
        PRIVATE_KEY_FILE = cfg.privateKeyFile;
        WEBHOOK_SECRET = cfg.webhookSecret;
        REDIS = config.services.redis.servers.flakeaway.unixSocket;
      } // (optionalAttrs (!isNull cfg.allowedUsers) {
        ALLOWED_USERS = concatStringsSep "," cfg.allowedUsers;
      });

      serviceConfig = {
        WorkingDirectory = "/var/lib/flakeaway";
        User = "flakeaway";
        Group = "flakeaway";

        ExecStart = "${pkgs.nodejs}/bin/node ${flakeaway}/bin/flakeaway";

        Restart = "on-failure";

        # Flakeaway will finish the current builds before stopping
        TimeoutStopSec = "infinity";
        # Only send SIGTERM to the main process, not child processes
        KillMode = "mixed";
      };
    };

    networking.firewall.allowedTCPPorts = [ 15345 ];
  };
}
