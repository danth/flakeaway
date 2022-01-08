{
  inputs.dream2nix.url = "github:DavHau/dream2nix";

  outputs = { self, dream2nix, ... }:
    dream2nix.lib.riseAndShine {
      systems = [ "x86_64-linux" "x86_64-darwin" ];
      source = ./.;
    } // {
      nixosModules.flakeaway = import ./nixos-module.nix self;
    };
}
