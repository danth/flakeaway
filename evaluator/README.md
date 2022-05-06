# Flakeaway evaluator

This subprogram is based upon code from
[nix-eval-jobs](https://github.com/nix-community/nix-eval-jobs).

The following changes have been made:

- Added the ability to recurse over common flake outputs, such as
  `packages`, `checks` and `nixosConfigurations`. This is different to
  the upstream flakes implementation which would require jobs to be
  specifically exported for Flakeaway.
- Removed functionality which is not used by Flakeaway. This has been
  done mainly so that it's easier for me to make further changes in
  the future, without having to work around unused code. It provides
  negligible improvements to performance.
