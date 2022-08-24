{
  inputs = {
    dream2nix = {
      url = "github:DavHau/dream2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    utils.url = "github:numtide/flake-utils";
  };

  outputs =
    inputs:
    let
      systems = [ "x86_64-linux" "x86_64-darwin" ];

      eachSystem = inputs.utils.lib.eachSystem systems;

      outputSets = [
        (inputs.dream2nix.lib.makeFlakeOutputs {
          inherit systems;
          source = ./cli;
          config.projectRoot = ./.;
          settings = [{ subsystemInfo.nodejs = 18; }];
        })

        (inputs.dream2nix.lib.makeFlakeOutputs {
          inherit systems;
          source = ./server;
          config.projectRoot = ./.;
          settings = [{ subsystemInfo.nodejs = 18; }];
        })

        (eachSystem (system: {
          packages.flakeaway-evaluator =
            let pkgs = import inputs.nixpkgs { inherit system; };
            in pkgs.callPackage ./evaluator {};
        }))

        {
          nixosModules.flakeaway = import ./nixos-module.nix inputs.self;
        }
      ];

    in builtins.foldl' inputs.nixpkgs.lib.recursiveUpdate {} outputSets;
}
