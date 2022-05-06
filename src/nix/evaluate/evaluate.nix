let
  op = jobs: path: val:
    let pathStr = builtins.concatStringsSep "." path;
    in
    if (builtins.typeOf val) != "set" then
      jobs
    else if val?type && val.type == "derivation" then
      (jobs // {
        "${pathStr}" = val;
      })
    else if builtins.elemAt path 0 == "nixosConfigurations" &&
            builtins.length path == 2 then
      (jobs // {
        "${pathStr}.config.system.build.toplevel" = val.config.system.build.toplevel;
      })
    else if builtins.length path >= 3 then
      jobs
    else
      (recurse jobs path val);

  recurse = jobs: path: val:
    builtins.foldl'
      (jobs: key: op jobs (path ++ [ key ]) val.${key})
      jobs
      (builtins.attrNames val);

  flatten = tree: recurse {} [] tree;

in
  { url }: flatten (builtins.getFlake url)
