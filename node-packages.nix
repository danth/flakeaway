# This file has been generated by node2nix 1.9.0. Do not edit!

{nodeEnv, fetchurl, fetchgit, nix-gitignore, stdenv, lib, globalBuildInputs ? []}:

let
  sources = {
    "@octokit/app-12.0.3" = {
      name = "_at_octokit_slash_app";
      packageName = "@octokit/app";
      version = "12.0.3";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/app/-/app-12.0.3.tgz";
        sha512 = "ag/g5ufxZl+t93b19WBdrg+7GLq3IgPsGb5z/xqjyCsV2tr7i2Dqjrah/IbTJ4ncNE7iIvMQI5/vKjiSSUxqCg==";
      };
    };
    "@octokit/auth-app-3.6.0" = {
      name = "_at_octokit_slash_auth-app";
      packageName = "@octokit/auth-app";
      version = "3.6.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/auth-app/-/auth-app-3.6.0.tgz";
        sha512 = "A+tLuHEMXw+Xz9dmKO7Ho9i4EmMr4tThrwYTlmMNu8y93JxvvRjKFFElpCTS+Z0NlbfuyNdaTlJnAinFbVKm7g==";
      };
    };
    "@octokit/auth-oauth-app-4.3.0" = {
      name = "_at_octokit_slash_auth-oauth-app";
      packageName = "@octokit/auth-oauth-app";
      version = "4.3.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/auth-oauth-app/-/auth-oauth-app-4.3.0.tgz";
        sha512 = "cETmhmOQRHCz6cLP7StThlJROff3A/ln67Q961GuIr9zvyFXZ4lIJy9RE6Uw5O7D8IXWPU3jhDnG47FTSGQr8Q==";
      };
    };
    "@octokit/auth-oauth-device-3.1.2" = {
      name = "_at_octokit_slash_auth-oauth-device";
      packageName = "@octokit/auth-oauth-device";
      version = "3.1.2";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/auth-oauth-device/-/auth-oauth-device-3.1.2.tgz";
        sha512 = "w7Po4Ck6N2aAn2VQyKLuojruiyKROTBv4qs6IwE5rbwF7HhBXXp4A/NKmkpoFIZkiXQtM+N8QtkSck4ApYWdGg==";
      };
    };
    "@octokit/auth-oauth-user-1.3.0" = {
      name = "_at_octokit_slash_auth-oauth-user";
      packageName = "@octokit/auth-oauth-user";
      version = "1.3.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/auth-oauth-user/-/auth-oauth-user-1.3.0.tgz";
        sha512 = "3QC/TAdk7onnxfyZ24BnJRfZv8TRzQK7SEFUS9vLng4Vv6Hv6I64ujdk/CUkREec8lhrwU764SZ/d+yrjjqhaQ==";
      };
    };
    "@octokit/auth-token-2.4.5" = {
      name = "_at_octokit_slash_auth-token";
      packageName = "@octokit/auth-token";
      version = "2.4.5";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/auth-token/-/auth-token-2.4.5.tgz";
        sha512 = "BpGYsPgJt05M7/L/5FoE1PiAbdxXFZkX/3kDYcsvd1v6UhlnE5e96dTDr0ezX/EFwciQxf3cNV0loipsURU+WA==";
      };
    };
    "@octokit/auth-unauthenticated-2.1.0" = {
      name = "_at_octokit_slash_auth-unauthenticated";
      packageName = "@octokit/auth-unauthenticated";
      version = "2.1.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/auth-unauthenticated/-/auth-unauthenticated-2.1.0.tgz";
        sha512 = "+baofLfSL0CAv3CfGQ9rxiZZQEX8VNJMGuuS4PgrMRBUL52Ho5+hQYb63UJQshw7EXYMPDZxbXznc0y33cbPqw==";
      };
    };
    "@octokit/core-3.5.1" = {
      name = "_at_octokit_slash_core";
      packageName = "@octokit/core";
      version = "3.5.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/core/-/core-3.5.1.tgz";
        sha512 = "omncwpLVxMP+GLpLPgeGJBF6IWJFjXDS5flY5VbppePYX9XehevbDykRH9PdCdvqt9TS5AOTiDide7h0qrkHjw==";
      };
    };
    "@octokit/endpoint-6.0.12" = {
      name = "_at_octokit_slash_endpoint";
      packageName = "@octokit/endpoint";
      version = "6.0.12";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/endpoint/-/endpoint-6.0.12.tgz";
        sha512 = "lF3puPwkQWGfkMClXb4k/eUT/nZKQfxinRWJrdZaJO85Dqwo/G0yOC434Jr2ojwafWJMYqFGFa5ms4jJUgujdA==";
      };
    };
    "@octokit/graphql-4.6.4" = {
      name = "_at_octokit_slash_graphql";
      packageName = "@octokit/graphql";
      version = "4.6.4";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/graphql/-/graphql-4.6.4.tgz";
        sha512 = "SWTdXsVheRmlotWNjKzPOb6Js6tjSqA2a8z9+glDJng0Aqjzti8MEWOtuT8ZSu6wHnci7LZNuarE87+WJBG4vg==";
      };
    };
    "@octokit/oauth-app-3.5.1" = {
      name = "_at_octokit_slash_oauth-app";
      packageName = "@octokit/oauth-app";
      version = "3.5.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/oauth-app/-/oauth-app-3.5.1.tgz";
        sha512 = "heRM/m5nZfN6b9lsNwfOQ+HnpqLu3ske1CBmKaQ8URuB3HEEkZjKJUaZmnXK2c2Q70sDtPSiiFEDuq4McP40mQ==";
      };
    };
    "@octokit/oauth-authorization-url-4.3.2" = {
      name = "_at_octokit_slash_oauth-authorization-url";
      packageName = "@octokit/oauth-authorization-url";
      version = "4.3.2";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/oauth-authorization-url/-/oauth-authorization-url-4.3.2.tgz";
        sha512 = "CkKc5+clTSd8nNAtwQWzBewASIpgxO8tEtU75AbVsjDuwDIDj9F0uJ5fjGvsa2rwkc8kP4CxTk5dvEe38SfbLA==";
      };
    };
    "@octokit/oauth-methods-1.2.4" = {
      name = "_at_octokit_slash_oauth-methods";
      packageName = "@octokit/oauth-methods";
      version = "1.2.4";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/oauth-methods/-/oauth-methods-1.2.4.tgz";
        sha512 = "85hen2Dkpnmy2PGfVFe7Ke9rUo//nlqUcHE4GiQBHJ7D95rAm19GcRO49LlH6NOXOMdEFj7i/Ay5GVDRrAk38w==";
      };
    };
    "@octokit/openapi-types-9.4.0" = {
      name = "_at_octokit_slash_openapi-types";
      packageName = "@octokit/openapi-types";
      version = "9.4.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/openapi-types/-/openapi-types-9.4.0.tgz";
        sha512 = "rKRkXikOJgDNImPl49IJuECLVXjj+t4qOXHhl8SBjMQCGGp1w4m5Ud/0kfdUx+zCpTvBN8vaOUDF4nnboZoOtQ==";
      };
    };
    "@octokit/plugin-paginate-rest-2.15.0" = {
      name = "_at_octokit_slash_plugin-paginate-rest";
      packageName = "@octokit/plugin-paginate-rest";
      version = "2.15.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/plugin-paginate-rest/-/plugin-paginate-rest-2.15.0.tgz";
        sha512 = "/vjcb0w6ggVRtsb8OJBcRR9oEm+fpdo8RJk45khaWw/W0c8rlB2TLCLyZt/knmC17NkX7T9XdyQeEY7OHLSV1g==";
      };
    };
    "@octokit/plugin-request-log-1.0.4" = {
      name = "_at_octokit_slash_plugin-request-log";
      packageName = "@octokit/plugin-request-log";
      version = "1.0.4";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/plugin-request-log/-/plugin-request-log-1.0.4.tgz";
        sha512 = "mLUsMkgP7K/cnFEw07kWqXGF5LKrOkD+lhCrKvPHXWDywAwuDUeDwWBpc69XK3pNX0uKiVt8g5z96PJ6z9xCFA==";
      };
    };
    "@octokit/plugin-rest-endpoint-methods-5.7.0" = {
      name = "_at_octokit_slash_plugin-rest-endpoint-methods";
      packageName = "@octokit/plugin-rest-endpoint-methods";
      version = "5.7.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/plugin-rest-endpoint-methods/-/plugin-rest-endpoint-methods-5.7.0.tgz";
        sha512 = "G7sgccWRYQMwcHJXkDY/sDxbXeKiZkFQqUtzBCwmrzCNj2GQf3VygQ4T/BFL2crLVpIbenkE/c0ErhYOte2MPw==";
      };
    };
    "@octokit/request-5.6.0" = {
      name = "_at_octokit_slash_request";
      packageName = "@octokit/request";
      version = "5.6.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/request/-/request-5.6.0.tgz";
        sha512 = "4cPp/N+NqmaGQwbh3vUsYqokQIzt7VjsgTYVXiwpUP2pxd5YiZB2XuTedbb0SPtv9XS7nzAKjAuQxmY8/aZkiA==";
      };
    };
    "@octokit/request-error-2.1.0" = {
      name = "_at_octokit_slash_request-error";
      packageName = "@octokit/request-error";
      version = "2.1.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/request-error/-/request-error-2.1.0.tgz";
        sha512 = "1VIvgXxs9WHSjicsRwq8PlR2LR2x6DwsJAaFgzdi0JfJoGSO8mYI/cHJQ+9FbN21aa+DrgNLnwObmyeSC8Rmpg==";
      };
    };
    "@octokit/rest-18.9.0" = {
      name = "_at_octokit_slash_rest";
      packageName = "@octokit/rest";
      version = "18.9.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/rest/-/rest-18.9.0.tgz";
        sha512 = "VrmrE8gjpuOoDAGjrQq2j9ZhOE6LxaqxaQg0yMrrEnnQZy2ZcAnr5qbVfKsMF0up/48PRV/VFS/2GSMhA7nTdA==";
      };
    };
    "@octokit/types-6.24.0" = {
      name = "_at_octokit_slash_types";
      packageName = "@octokit/types";
      version = "6.24.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/types/-/types-6.24.0.tgz";
        sha512 = "MfEimJeQ8AV1T2nI5kOfHqsqPHaAnG0Dw3MVoHSEsEq6iLKx2N91o+k2uAgXhPYeSE76LVBqjgTShnFFgNwe0A==";
      };
    };
    "@octokit/webhooks-9.12.0" = {
      name = "_at_octokit_slash_webhooks";
      packageName = "@octokit/webhooks";
      version = "9.12.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/webhooks/-/webhooks-9.12.0.tgz";
        sha512 = "B/KK96mmmRju3lK8jRe78z2h4rSAAysT+rcT5Aw5aIXueOOHsFFgRNQF6GB+/0xwm9KkpMY96Z9vj2gwyOiatA==";
      };
    };
    "@octokit/webhooks-methods-2.0.0" = {
      name = "_at_octokit_slash_webhooks-methods";
      packageName = "@octokit/webhooks-methods";
      version = "2.0.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/webhooks-methods/-/webhooks-methods-2.0.0.tgz";
        sha512 = "35cfQ4YWlnZnmZKmIxlGPUPLtbkF8lr/A/1Sk1eC0ddLMwQN06dOuLc+dI3YLQS+T+MoNt3DIQ0NynwgKPilig==";
      };
    };
    "@octokit/webhooks-types-4.3.0" = {
      name = "_at_octokit_slash_webhooks-types";
      packageName = "@octokit/webhooks-types";
      version = "4.3.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@octokit/webhooks-types/-/webhooks-types-4.3.0.tgz";
        sha512 = "Hp2o49WSiLHLwp8a9aQD9qK+uoa45Q/gnJG7a+EEZ4rLk5oDVCzlMbtsezxUPXG7/eLj05GciCzdzgJWANugEA==";
      };
    };
    "@types/btoa-lite-1.0.0" = {
      name = "_at_types_slash_btoa-lite";
      packageName = "@types/btoa-lite";
      version = "1.0.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/@types/btoa-lite/-/btoa-lite-1.0.0.tgz";
        sha512 = "wJsiX1tosQ+J5+bY5LrSahHxr2wT+uME5UDwdN1kg4frt40euqA+wzECkmq4t5QbveHiJepfdThgQrPw6KiSlg==";
      };
    };
    "@types/jsonwebtoken-8.5.4" = {
      name = "_at_types_slash_jsonwebtoken";
      packageName = "@types/jsonwebtoken";
      version = "8.5.4";
      src = fetchurl {
        url = "https://registry.npmjs.org/@types/jsonwebtoken/-/jsonwebtoken-8.5.4.tgz";
        sha512 = "4L8msWK31oXwdtC81RmRBAULd0ShnAHjBuKT9MRQpjP0piNrZdXyTRcKY9/UIfhGeKIT4PvF5amOOUbbT/9Wpg==";
      };
    };
    "@types/lru-cache-5.1.1" = {
      name = "_at_types_slash_lru-cache";
      packageName = "@types/lru-cache";
      version = "5.1.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/@types/lru-cache/-/lru-cache-5.1.1.tgz";
        sha512 = "ssE3Vlrys7sdIzs5LOxCzTVMsU7i9oa/IaW92wF32JFb3CVczqOkru2xspuKczHEbG3nvmPY7IFqVmGGHdNbYw==";
      };
    };
    "@types/node-16.4.13" = {
      name = "_at_types_slash_node";
      packageName = "@types/node";
      version = "16.4.13";
      src = fetchurl {
        url = "https://registry.npmjs.org/@types/node/-/node-16.4.13.tgz";
        sha512 = "bLL69sKtd25w7p1nvg9pigE4gtKVpGTPojBFLMkGHXuUgap2sLqQt2qUnqmVCDfzGUL0DRNZP+1prIZJbMeAXg==";
      };
    };
    "aggregate-error-3.1.0" = {
      name = "aggregate-error";
      packageName = "aggregate-error";
      version = "3.1.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/aggregate-error/-/aggregate-error-3.1.0.tgz";
        sha512 = "4I7Td01quW/RpocfNayFdFVk1qSuoh0E7JrbRJ16nH01HhKFQ88INq9Sd+nd72zqRySlr9BmDA8xlEJ6vJMrYA==";
      };
    };
    "before-after-hook-2.2.2" = {
      name = "before-after-hook";
      packageName = "before-after-hook";
      version = "2.2.2";
      src = fetchurl {
        url = "https://registry.npmjs.org/before-after-hook/-/before-after-hook-2.2.2.tgz";
        sha512 = "3pZEU3NT5BFUo/AD5ERPWOgQOCZITni6iavr5AUw5AUwQjMlI0kzu5btnyD39AF0gUEsDPwJT+oY1ORBJijPjQ==";
      };
    };
    "bluebird-3.7.2" = {
      name = "bluebird";
      packageName = "bluebird";
      version = "3.7.2";
      src = fetchurl {
        url = "https://registry.npmjs.org/bluebird/-/bluebird-3.7.2.tgz";
        sha512 = "XpNj6GDQzdfW+r2Wnn7xiSAd7TM3jzkxGXBGTtWKuSXv1xUV+azxAm8jdWZN06QTQk+2N2XB9jRDkvbmQmcRtg==";
      };
    };
    "btoa-lite-1.0.0" = {
      name = "btoa-lite";
      packageName = "btoa-lite";
      version = "1.0.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/btoa-lite/-/btoa-lite-1.0.0.tgz";
        sha1 = "337766da15801210fdd956c22e9c6891ab9d0337";
      };
    };
    "buffer-equal-constant-time-1.0.1" = {
      name = "buffer-equal-constant-time";
      packageName = "buffer-equal-constant-time";
      version = "1.0.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/buffer-equal-constant-time/-/buffer-equal-constant-time-1.0.1.tgz";
        sha1 = "f8e71132f7ffe6e01a5c9697a4c6f3e48d5cc819";
      };
    };
    "clean-stack-2.2.0" = {
      name = "clean-stack";
      packageName = "clean-stack";
      version = "2.2.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/clean-stack/-/clean-stack-2.2.0.tgz";
        sha512 = "4diC9HaTE+KRAMWhDhrGOECgWZxoevMc5TlkObMqNSsVU62PYzXZ/SMTjzyGAFF1YusgxGcSWTEXBhp0CPwQ1A==";
      };
    };
    "deprecation-2.3.1" = {
      name = "deprecation";
      packageName = "deprecation";
      version = "2.3.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/deprecation/-/deprecation-2.3.1.tgz";
        sha512 = "xmHIy4F3scKVwMsQ4WnVaS8bHOx0DmVwRywosKhaILI0ywMDWPtBSku2HNxRvF7jtwDRsoEwYQSfbxj8b7RlJQ==";
      };
    };
    "ecdsa-sig-formatter-1.0.11" = {
      name = "ecdsa-sig-formatter";
      packageName = "ecdsa-sig-formatter";
      version = "1.0.11";
      src = fetchurl {
        url = "https://registry.npmjs.org/ecdsa-sig-formatter/-/ecdsa-sig-formatter-1.0.11.tgz";
        sha512 = "nagl3RYrbNv6kQkeJIpt6NJZy8twLB/2vtz6yN9Z4vRKHN4/QZJIEbqohALSgwKdnksuY3k5Addp5lg8sVoVcQ==";
      };
    };
    "fromentries-1.3.2" = {
      name = "fromentries";
      packageName = "fromentries";
      version = "1.3.2";
      src = fetchurl {
        url = "https://registry.npmjs.org/fromentries/-/fromentries-1.3.2.tgz";
        sha512 = "cHEpEQHUg0f8XdtZCc2ZAhrHzKzT0MrFUTcvx+hfxYu7rGMDc5SKoXFh+n4YigxsHXRzc6OrCshdR1bWH6HHyg==";
      };
    };
    "graceful-fs-4.2.8" = {
      name = "graceful-fs";
      packageName = "graceful-fs";
      version = "4.2.8";
      src = fetchurl {
        url = "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.8.tgz";
        sha512 = "qkIilPUYcNhJpd33n0GBXTB1MMPp14TxEsEs0pTrsSVucApsYzW5V+Q8Qxhik6KU3evy+qkAAowTByymK0avdg==";
      };
    };
    "indent-string-4.0.0" = {
      name = "indent-string";
      packageName = "indent-string";
      version = "4.0.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/indent-string/-/indent-string-4.0.0.tgz";
        sha512 = "EdDDZu4A2OyIK7Lr/2zG+w5jmbuk1DVBnEwREQvBzspBJkCEbRa8GxU1lghYcaGJCnRWibjDXlq779X1/y5xwg==";
      };
    };
    "is-plain-object-5.0.0" = {
      name = "is-plain-object";
      packageName = "is-plain-object";
      version = "5.0.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/is-plain-object/-/is-plain-object-5.0.0.tgz";
        sha512 = "VRSzKkbMm5jMDoKLbltAkFQ5Qr7VDiTFGXxYFXXowVj387GeGNOCsOH6Msy00SGZ3Fp84b1Naa1psqgcCIEP5Q==";
      };
    };
    "is-promise-2.2.2" = {
      name = "is-promise";
      packageName = "is-promise";
      version = "2.2.2";
      src = fetchurl {
        url = "https://registry.npmjs.org/is-promise/-/is-promise-2.2.2.tgz";
        sha512 = "+lP4/6lKUBfQjZ2pdxThZvLUAafmZb8OAxFb8XXtiQmS35INgr85hdOGoEs124ez1FCnZJt6jau/T+alh58QFQ==";
      };
    };
    "jju-1.4.0" = {
      name = "jju";
      packageName = "jju";
      version = "1.4.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/jju/-/jju-1.4.0.tgz";
        sha1 = "a3abe2718af241a2b2904f84a625970f389ae32a";
      };
    };
    "json-parse-helpfulerror-1.0.3" = {
      name = "json-parse-helpfulerror";
      packageName = "json-parse-helpfulerror";
      version = "1.0.3";
      src = fetchurl {
        url = "https://registry.npmjs.org/json-parse-helpfulerror/-/json-parse-helpfulerror-1.0.3.tgz";
        sha1 = "13f14ce02eed4e981297b64eb9e3b932e2dd13dc";
      };
    };
    "jsonwebtoken-8.5.1" = {
      name = "jsonwebtoken";
      packageName = "jsonwebtoken";
      version = "8.5.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/jsonwebtoken/-/jsonwebtoken-8.5.1.tgz";
        sha512 = "XjwVfRS6jTMsqYs0EsuJ4LGxXV14zQybNd4L2r0UvbVnSF9Af8x7p5MzbJ90Ioz/9TI41/hTCvznF/loiSzn8w==";
      };
    };
    "jwa-1.4.1" = {
      name = "jwa";
      packageName = "jwa";
      version = "1.4.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/jwa/-/jwa-1.4.1.tgz";
        sha512 = "qiLX/xhEEFKUAJ6FiBMbes3w9ATzyk5W7Hvzpa/SLYdxNtng+gcurvrI7TbACjIXlsJyr05/S1oUhZrc63evQA==";
      };
    };
    "jws-3.2.2" = {
      name = "jws";
      packageName = "jws";
      version = "3.2.2";
      src = fetchurl {
        url = "https://registry.npmjs.org/jws/-/jws-3.2.2.tgz";
        sha512 = "YHlZCB6lMTllWDtSPHz/ZXTsi8S00usEV6v1tjq8tOUZzw7DpSDWVXjXDre6ed1w/pd495ODpHZYSdkRTsa0HA==";
      };
    };
    "lodash-4.17.21" = {
      name = "lodash";
      packageName = "lodash";
      version = "4.17.21";
      src = fetchurl {
        url = "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz";
        sha512 = "v2kDEe57lecTulaDIuNTPy3Ry4gLGJ6Z1O3vE1krgXZNrsQ+LFTGHVxVjcXPs17LhbZVGedAJv8XZ1tvj5FvSg==";
      };
    };
    "lodash.includes-4.3.0" = {
      name = "lodash.includes";
      packageName = "lodash.includes";
      version = "4.3.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/lodash.includes/-/lodash.includes-4.3.0.tgz";
        sha1 = "60bb98a87cb923c68ca1e51325483314849f553f";
      };
    };
    "lodash.isboolean-3.0.3" = {
      name = "lodash.isboolean";
      packageName = "lodash.isboolean";
      version = "3.0.3";
      src = fetchurl {
        url = "https://registry.npmjs.org/lodash.isboolean/-/lodash.isboolean-3.0.3.tgz";
        sha1 = "6c2e171db2a257cd96802fd43b01b20d5f5870f6";
      };
    };
    "lodash.isinteger-4.0.4" = {
      name = "lodash.isinteger";
      packageName = "lodash.isinteger";
      version = "4.0.4";
      src = fetchurl {
        url = "https://registry.npmjs.org/lodash.isinteger/-/lodash.isinteger-4.0.4.tgz";
        sha1 = "619c0af3d03f8b04c31f5882840b77b11cd68343";
      };
    };
    "lodash.isnumber-3.0.3" = {
      name = "lodash.isnumber";
      packageName = "lodash.isnumber";
      version = "3.0.3";
      src = fetchurl {
        url = "https://registry.npmjs.org/lodash.isnumber/-/lodash.isnumber-3.0.3.tgz";
        sha1 = "3ce76810c5928d03352301ac287317f11c0b1ffc";
      };
    };
    "lodash.isplainobject-4.0.6" = {
      name = "lodash.isplainobject";
      packageName = "lodash.isplainobject";
      version = "4.0.6";
      src = fetchurl {
        url = "https://registry.npmjs.org/lodash.isplainobject/-/lodash.isplainobject-4.0.6.tgz";
        sha1 = "7c526a52d89b45c45cc690b88163be0497f550cb";
      };
    };
    "lodash.isstring-4.0.1" = {
      name = "lodash.isstring";
      packageName = "lodash.isstring";
      version = "4.0.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/lodash.isstring/-/lodash.isstring-4.0.1.tgz";
        sha1 = "d527dfb5456eca7cc9bb95d5daeaf88ba54a5451";
      };
    };
    "lodash.once-4.1.1" = {
      name = "lodash.once";
      packageName = "lodash.once";
      version = "4.1.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/lodash.once/-/lodash.once-4.1.1.tgz";
        sha1 = "0dd3971213c7c56df880977d504c88fb471a97ac";
      };
    };
    "lowdb-0.14.0" = {
      name = "lowdb";
      packageName = "lowdb";
      version = "0.14.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/lowdb/-/lowdb-0.14.0.tgz";
        sha1 = "cce4e6affe867c6cd4b196b382d3359b4d39efb5";
      };
    };
    "lru-cache-6.0.0" = {
      name = "lru-cache";
      packageName = "lru-cache";
      version = "6.0.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/lru-cache/-/lru-cache-6.0.0.tgz";
        sha512 = "Jo6dJ04CmSjuznwJSS3pUeWmd/H0ffTlkXXgwZi+eq1UCmqQwCh+eLsYOYCwY991i2Fah4h1BEMCx4qThGbsiA==";
      };
    };
    "ms-2.1.3" = {
      name = "ms";
      packageName = "ms";
      version = "2.1.3";
      src = fetchurl {
        url = "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz";
        sha512 = "6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==";
      };
    };
    "node-fetch-2.6.1" = {
      name = "node-fetch";
      packageName = "node-fetch";
      version = "2.6.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/node-fetch/-/node-fetch-2.6.1.tgz";
        sha512 = "V4aYg89jEoVRxRb2fJdAg8FHvI7cEyYdVAh94HH0UIK8oJxUfkjlDQN9RbMx+bEjP7+ggMiFRprSti032Oipxw==";
      };
    };
    "once-1.4.0" = {
      name = "once";
      packageName = "once";
      version = "1.4.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/once/-/once-1.4.0.tgz";
        sha1 = "583b1aa775961d4b113ac17d9c50baef9dd76bd1";
      };
    };
    "queuey-1.5.1" = {
      name = "queuey";
      packageName = "queuey";
      version = "1.5.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/queuey/-/queuey-1.5.1.tgz";
        sha1 = "d8f9e392734e94dcf6817017ecf47046c50655a9";
      };
    };
    "safe-buffer-5.2.1" = {
      name = "safe-buffer";
      packageName = "safe-buffer";
      version = "5.2.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz";
        sha512 = "rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==";
      };
    };
    "semver-5.7.1" = {
      name = "semver";
      packageName = "semver";
      version = "5.7.1";
      src = fetchurl {
        url = "https://registry.npmjs.org/semver/-/semver-5.7.1.tgz";
        sha512 = "sauaDf/PZdVgrLTNYHRtpXa1iRiKcaebiKQ1BJdpQlWH2lCvexQdX55snPFyK7QzpudqbCI0qXFfOasHdyNDGQ==";
      };
    };
    "steno-0.4.4" = {
      name = "steno";
      packageName = "steno";
      version = "0.4.4";
      src = fetchurl {
        url = "https://registry.npmjs.org/steno/-/steno-0.4.4.tgz";
        sha1 = "071105bdfc286e6615c0403c27e9d7b5dcb855cb";
      };
    };
    "universal-github-app-jwt-1.1.0" = {
      name = "universal-github-app-jwt";
      packageName = "universal-github-app-jwt";
      version = "1.1.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/universal-github-app-jwt/-/universal-github-app-jwt-1.1.0.tgz";
        sha512 = "3b+ocAjjz4JTyqaOT+NNBd5BtTuvJTxWElIoeHSVelUV9J3Jp7avmQTdLKCaoqi/5Ox2o/q+VK19TJ233rVXVQ==";
      };
    };
    "universal-user-agent-6.0.0" = {
      name = "universal-user-agent";
      packageName = "universal-user-agent";
      version = "6.0.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/universal-user-agent/-/universal-user-agent-6.0.0.tgz";
        sha512 = "isyNax3wXoKaulPDZWHQqbmIx1k2tb9fb3GGDBRxCscfYV2Ch7WxPArBsFEG8s/safwXTT7H4QGhaIkTp9447w==";
      };
    };
    "uuid-8.3.2" = {
      name = "uuid";
      packageName = "uuid";
      version = "8.3.2";
      src = fetchurl {
        url = "https://registry.npmjs.org/uuid/-/uuid-8.3.2.tgz";
        sha512 = "+NYs2QeMWy+GWFOEm9xnn6HCDp0l7QBD7ml8zLUmJ+93Q5NF0NocErnwkTkXVFNiX3/fpC6afS8Dhb/gz7R7eg==";
      };
    };
    "wrappy-1.0.2" = {
      name = "wrappy";
      packageName = "wrappy";
      version = "1.0.2";
      src = fetchurl {
        url = "https://registry.npmjs.org/wrappy/-/wrappy-1.0.2.tgz";
        sha1 = "b5243d8f3ec1aa35f1364605bc0d1036e30ab69f";
      };
    };
    "yallist-4.0.0" = {
      name = "yallist";
      packageName = "yallist";
      version = "4.0.0";
      src = fetchurl {
        url = "https://registry.npmjs.org/yallist/-/yallist-4.0.0.tgz";
        sha512 = "3wdGidZyq5PB084XLES5TpOSRA3wjXAlIWMhum2kRcv/41Sn2emQ0dycQW4uZXLejwKvg6EsvbdlVL+FYEct7A==";
      };
    };
  };
  args = {
    name = "flakeaway";
    packageName = "flakeaway";
    version = "0.0.0";
    src = ./.;
    dependencies = [
      sources."@octokit/app-12.0.3"
      sources."@octokit/auth-app-3.6.0"
      sources."@octokit/auth-oauth-app-4.3.0"
      sources."@octokit/auth-oauth-device-3.1.2"
      sources."@octokit/auth-oauth-user-1.3.0"
      sources."@octokit/auth-token-2.4.5"
      sources."@octokit/auth-unauthenticated-2.1.0"
      sources."@octokit/core-3.5.1"
      sources."@octokit/endpoint-6.0.12"
      sources."@octokit/graphql-4.6.4"
      sources."@octokit/oauth-app-3.5.1"
      sources."@octokit/oauth-authorization-url-4.3.2"
      sources."@octokit/oauth-methods-1.2.4"
      sources."@octokit/openapi-types-9.4.0"
      sources."@octokit/plugin-paginate-rest-2.15.0"
      sources."@octokit/plugin-request-log-1.0.4"
      sources."@octokit/plugin-rest-endpoint-methods-5.7.0"
      sources."@octokit/request-5.6.0"
      sources."@octokit/request-error-2.1.0"
      sources."@octokit/rest-18.9.0"
      sources."@octokit/types-6.24.0"
      sources."@octokit/webhooks-9.12.0"
      sources."@octokit/webhooks-methods-2.0.0"
      sources."@octokit/webhooks-types-4.3.0"
      sources."@types/btoa-lite-1.0.0"
      sources."@types/jsonwebtoken-8.5.4"
      sources."@types/lru-cache-5.1.1"
      sources."@types/node-16.4.13"
      sources."aggregate-error-3.1.0"
      sources."before-after-hook-2.2.2"
      sources."bluebird-3.7.2"
      sources."btoa-lite-1.0.0"
      sources."buffer-equal-constant-time-1.0.1"
      sources."clean-stack-2.2.0"
      sources."deprecation-2.3.1"
      sources."ecdsa-sig-formatter-1.0.11"
      sources."fromentries-1.3.2"
      sources."graceful-fs-4.2.8"
      sources."indent-string-4.0.0"
      sources."is-plain-object-5.0.0"
      sources."is-promise-2.2.2"
      sources."jju-1.4.0"
      sources."json-parse-helpfulerror-1.0.3"
      sources."jsonwebtoken-8.5.1"
      sources."jwa-1.4.1"
      sources."jws-3.2.2"
      sources."lodash-4.17.21"
      sources."lodash.includes-4.3.0"
      sources."lodash.isboolean-3.0.3"
      sources."lodash.isinteger-4.0.4"
      sources."lodash.isnumber-3.0.3"
      sources."lodash.isplainobject-4.0.6"
      sources."lodash.isstring-4.0.1"
      sources."lodash.once-4.1.1"
      sources."lowdb-0.14.0"
      sources."lru-cache-6.0.0"
      sources."ms-2.1.3"
      sources."node-fetch-2.6.1"
      sources."once-1.4.0"
      sources."queuey-1.5.1"
      sources."safe-buffer-5.2.1"
      sources."semver-5.7.1"
      sources."steno-0.4.4"
      sources."universal-github-app-jwt-1.1.0"
      sources."universal-user-agent-6.0.0"
      sources."uuid-8.3.2"
      sources."wrappy-1.0.2"
      sources."yallist-4.0.0"
    ];
    buildInputs = globalBuildInputs;
    meta = {
      homepage = "https://github.com/danth/flakeaway#readme";
    };
    production = true;
    bypassCache = true;
    reconstructLock = true;
  };
in
{
  args = args;
  sources = sources;
  tarball = nodeEnv.buildNodeSourceDist args;
  package = nodeEnv.buildNodePackage args;
  shell = nodeEnv.buildNodeShell args;
  nodeDependencies = nodeEnv.buildNodeDependencies (lib.overrideExisting args {
    src = stdenv.mkDerivation {
      name = args.name + "-package-json";
      src = nix-gitignore.gitignoreSourcePure [
        "*"
        "!package.json"
        "!package-lock.json"
      ] args.src;
      dontBuild = true;
      installPhase = "mkdir -p $out; cp -r ./* $out;";
    };
  });
}