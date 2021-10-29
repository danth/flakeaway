{
  inputs = {
    dream2nix.url = "github:DavHau/dream2nix";
    utils.url = "github:numtide/flake-utils";
  };

  outputs = { dream2nix, utils, ... }:
    utils.lib.eachSystem [ "x86_64-linux" "x86_64-darwin" ] (system:
      let
        inherit (dream2nix.lib.dream2nix.${system}) riseAndShine;
        build = riseAndShine {
          dreamLock = ./dream.lock;
          sourceOverrides = oldSources: { "flakeaway#0.0.0" = ./.; };
        };
        inherit (build) package;
      in {
        packages.flakeaway = package;
        defaultPackage = package;
      });
}
