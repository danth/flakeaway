{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, utils, ... }:
    utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        node-packages = import ./default.nix { inherit pkgs system; };
        inherit (node-packages) package;
      in rec {
        packages.flakeaway = package;
        defaultPackage = package;
      });
}
