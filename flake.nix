{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    dream2nix = {
      url = "github:DavHau/dream2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { nixpkgs, dream2nix, self, ... }:
    let
      commonArgs = {
        systems = [ "aarch64-linux" "i686-linux" "x86_64-linux" ];
        config.projectRoot = ./.;
        settings = [{ subsystemInfo.nodejs = 18; }];
      };

      cli = dream2nix.lib.makeFlakeOutputs
        (commonArgs // { source = ./cli; });

      server = dream2nix.lib.makeFlakeOutputs
        (commonArgs // { source = ./server; });

    in {
      packages = nixpkgs.lib.genAttrs commonArgs.systems (system: {
        flakeaway-cli = cli.packages.${system}.flakeaway-cli;

        flakeaway-server = server.packages.${system}.flakeaway-server;

        flakeaway-evaluator =
          let pkgs = import nixpkgs { inherit system; };
          in pkgs.callPackage ./evaluator {};
      });

      nixosModules.flakeaway = import ./nixos-module.nix self;
    };
}
