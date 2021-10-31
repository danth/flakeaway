{
  inputs.dream2nix.url = "github:DavHau/dream2nix";

  outputs = { dream2nix, ... }:
    dream2nix.lib.riseAndShine {
      systems = [ "x86_64-linux" "x86_64-darwin" ];
      dreamLock = ./dream.lock;
      sourceOverrides = oldSources: { "flakeaway#0.0.0" = ./.; };
    };
}
