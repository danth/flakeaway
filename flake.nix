{
  inputs.dream2nix.url = "github:DavHau/dream2nix";

  outputs =
    inputs:
    let
      dream2nix =  inputs.dream2nix.lib.init {
        systems = [ "x86_64-linux" "x86_64-darwin" ];
        config.projectRoot = ./.;
      };
    in dream2nix.makeFlakeOutputs {
      source = ./.;
    } // {
      nixosModules.flakeaway = import ./nixos-module.nix inputs.self;
    };
}
