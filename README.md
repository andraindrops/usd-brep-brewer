# usd-brep-brewer

A headless CAD for coding agents, built on NVIDIA's USD BRep.

https://github.com/user-attachments/assets/93e992c3-c0b0-4f8a-820f-afd13207484b

## Getting started

### Requires

- Docker
- Node.js 18+

### Steps

1. Start the viewer (keep it running)

   ```sh
   npx -y usd-brep-brewer view
   ```

2. New

   ```sh
   npx -y usd-brep-brewer new hello
   ```

   Edit `jobs/hello/gen.py`.

3. Run

   ```sh
   npx -y usd-brep-brewer run hello
   ```

4. Open

   `http://localhost:3000/?job=hello`

- Jobs live in `./jobs/<job-id>/` under the current directory.
- Set `PORT` to change the viewer port.

### Colors

To color parts, have `gen.py` write `/work/colors.json`: keys are brep indices (the order the breps were passed to `out.usda`, from 0) as strings, values are `"#rrggbb"`, e.g. `{"45": "#ff7800", "46": "#ff7800"}`. Breps not listed stay gray. Each brep's color is also in `report.json` (`breps[i].color`); bad JSON, out-of-range indices or non-`#rrggbb` values are reported in `errors` and make `ok` false.
