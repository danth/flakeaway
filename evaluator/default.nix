{ boost, cmake, meson, ninja, nix, nlohmann_json, pkg-config, stdenv }:

stdenv.mkDerivation rec {
  name = "flakeaway-evaluator";

  src = ./.;

  buildInputs = [ boost nix nlohmann_json ];
  nativeBuildInputs = [
    meson
    ninja
    pkg-config
    # nlohmann_json can be only discovered via cmake files
    cmake
  ];
}
