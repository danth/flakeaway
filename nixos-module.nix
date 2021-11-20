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
  };

  config = mkIf cfg.enable {
    services.redis = {
      enable = true;
      port = 6379;
    };

    users = {
      users.flakeaway = {
        isSystemUser = true;
        home = "/var/lib/flakeaway";
        createHome = true;
        group = "flakeaway";
      };
      groups.flakeaway = { };
    };

    nix.allowedUsers = [ "flakeaway" ];

    systemd.services.flakeaway = {
      description = "Flakeaway CI server";

      wants = [ "network-online.target" "redis.service" ];
      after = [ "network-online.target" "redis.service" ];
      wantedBy = [ "default.target" ];

      path = with pkgs; [ gitMinimal nix_2_4 ];

      environment = {
        APP_ID = cfg.appId;
        CLIENT_ID = cfg.clientId;
        CLIENT_SECRET = cfg.clientSecret;
        PRIVATE_KEY_FILE = cfg.privateKeyFile;
        WEBHOOK_SECRET = cfg.webhookSecret;
      };

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
