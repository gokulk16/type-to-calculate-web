# Type To Calculate

Webapp is deployed [here](https://typetocalculate.netlify.app/)

[![Netlify Status](https://api.netlify.com/api/v1/badges/4c3aa90c-d121-454b-b8c3-ae78a6eaf738/deploy-status)](https://app.netlify.com/sites/typetocalculate/deploys)
![Known Vulnerabilities](https://snyk.io/test/github/gokulk16/type-to-calculate-web/badge.svg)
![Coverage Badge](https://gist.githubusercontent.com/gokulk16/eaf6c29242b70728224cc81c3f9ba750/raw/badge-type-to-calculate-web-main.svg)


Just type from the keyboard and do the math. No need to open the calculator.

Features:
- supports 'x' as a multiplication operator.
  - Example: 2x3 results 6
- Supports currency conversion.
  - Example: '1 usd to inr', '10 gbp to usd'
- [Allowed operators](https://mathjs.org/docs/expressions/syntax.html#operators)
  
  <img width="764" alt="Screenshot 2024-04-24 at 5 48 35 PM" src="https://github.com/gokulk16/type-to-calculate/assets/8376313/76f2b345-0413-412a-93b6-f967c5b12457">
- Supports conversions of length, area, volume, temperature, time, etc [Allowed unit conversions](https://mathjs.org/docs/datatypes/units.html#reference)
  
  <img width="810" alt="Screenshot 2024-04-24 at 5 41 16 PM" src="https://github.com/gokulk16/type-to-calculate/assets/8376313/9a88f75f-38c1-4e98-8f58-c216de31bd96">
Based on [math-js](https://www.npmjs.com/package/mathjs)

<!-- Add a readme text on how to run this locally and contribute -->
## Run Locally
1. Clone the repository
2. Navigate to the project directory
3. Install dependencies
   ```npm install``` 
4. Build
   ``` npm run build ```
5. Start the development server
   ``` cd dist && npx http-server ```