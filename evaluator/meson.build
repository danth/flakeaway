project(
  'flakeaway-evaluator',
  'cpp',
  version : '0.0.0',
  license : 'AGPL-3.0',
)

executable(
  'flakeaway-evaluator',
  ['flakeaway-evaluator.cc'],
  dependencies : [
    dependency('boost', required: true),
    dependency('nix-cmd', required: true),
    dependency('nix-expr', required: true),
    dependency('nix-main', required: true),
    dependency('nix-store', required: true),
    dependency('nlohmann_json', required: true),
    dependency('threads', required: true)
  ],
  install: true,
  cpp_args: ['-std=c++17', '-fvisibility=hidden']
)
