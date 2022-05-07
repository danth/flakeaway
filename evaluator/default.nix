{ lib, boost, cmake, meson, ninja, nix, nlohmann_json, pkg-config, stdenv }:

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

  meta = {
    description = "Parallel job evaluator for Flakeaway, based upon nix-eval-jobs";
    homepage = "https://github.com/danth/flakeaway/tree/master/evaluator";
    license = lib.licenses.gpl3;
    maintainers = with lib.maintainers; [ danth ];
    platforms = lib.platforms.unix;
  };
}
