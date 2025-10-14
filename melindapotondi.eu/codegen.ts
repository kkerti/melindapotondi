
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: "http://localhost:3000/shop-api",
  generates: {
    "src/generated/graphql.ts": {
      plugins: ["typescript"]
    }
  }
};

export default config;
