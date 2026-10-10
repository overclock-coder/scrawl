# Hosting the settler

The settler is a small always-on Node process: it keeps a live price feed open, records prices every second, waits
for each 60 second window, scores the drawing and closes the position on-chain. It needs a host that keeps the
process running with full CPU and gives you an https address.

## Pick a host that does not throttle idle CPU

| Host | Works? |
|---|---|
| AWS Lightsail container service | Yes. Always on, https address included, a few dollars a month (AWS credits apply). |
| AWS EC2 / ECS Fargate | Yes, but you add the https layer yourself. |
| AWS App Runner | **No.** It throttles CPU between requests, which starves the price feed and the settle timers. |
| Vercel and other serverless hosts | **No.** Functions cannot hold a feed or a timer. |

## Environment variables

| Name | Value |
|---|---|
| `SETTLER_KEYPAIR_JSON` | The settler key as a JSON array of 64 numbers (the contents of `~/.config/solana/scrawl-settler.json`). Secret. |
| `RPC_URL` | Optional. A dedicated devnet RPC avoids the public endpoint's rate limits. |
| `PORT` | Optional, defaults to 3000. |

The settler wallet pays transaction fees, so keep a little devnet SOL in it (`solana balance <address> -u devnet`).

## Lightsail container service, step by step

1. **Build and publish an x86-64 image.** Lightsail runs x86-64, and an Apple Silicon Mac builds arm64 by default,
   so pick one of these (the image holds no secrets; the key is an environment variable):

   - **Easiest, no local tooling: AWS CloudShell** (the terminal icon in the AWS console, x86-64, has Docker).
     Clone the repo and build there:

     ```
     git clone https://github.com/overclock-coder/scrawl.git && cd scrawl
     docker build -f settler/Dockerfile -t <dockerhub-user>/scrawl-settler:latest .
     docker login && docker push <dockerhub-user>/scrawl-settler:latest
     ```

   - **From your Mac** (Colima or Docker Desktop plus the buildx plugin, `brew install docker-buildx`):

     ```
     docker buildx build --platform linux/amd64 -f settler/Dockerfile \
       -t <dockerhub-user>/scrawl-settler:latest --push .
     ```

2. In the AWS console open **Lightsail → Containers → Create container service**. Choose **Nano**, scale **1**.
3. Under **Set up deployment**, add a container: image `<dockerhub-user>/scrawl-settler:latest`, open port `3000` (HTTP),
   and add the environment variable `SETTLER_KEYPAIR_JSON`.
4. Under **Public endpoint**, choose that container, port 3000, and set the health check path to `/health`.
5. Deploy. When the status is **Running**, open `https://<service>.<region>.cs.amazonlightsail.com/health`.
   You should see `{"ok":true,"feedLive":true,...}`.

## Point the app at it

Rebuild the release APK with the address baked in:

```
EXPO_PUBLIC_SETTLER_URL=https://<service>.<region>.cs.amazonlightsail.com \
EXPO_PUBLIC_APP_URI=https://<where-deck/site-is-hosted> \
  (cd android && ./gradlew assembleRelease)
```

## What it does if it restarts

Jobs are held in memory. A position the settler has no drawing for is **refunded in full, with no fee, once its window
closed more than five minutes ago**, so a restart never strands a stake. A drawing registered before a restart is lost
and that position is refunded instead of scored.
