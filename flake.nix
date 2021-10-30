{
  inputs.dream2nix.url = "github:DavHau/dream2nix";

  outputs = { dream2nix, ... }:
    let
      dreamOutputs = dream2nix.lib.dream2nix.riseAndShine {
        systems = [ "x86_64-linux" "x86_64-darwin" ];
        dreamLock = ./dream.lock;
        sourceOverrides = oldSources: { "flakeaway#0.0.0" = ./.; };
      };
    in rec {
      inherit (dreamOutputs) defaultPackage;
      packages = builtins.mapAttrs
        (system: package: { flakeaway = package; })
        defaultPackage;
    };
}
