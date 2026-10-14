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
