// One-time: create the config + vault on a cluster. Usage: node scripts/init-devnet.mjs <settler-pubkey> [rpc]
import anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";

const { AnchorProvider, Program, Wallet } = anchor;
const settler = new PublicKey(process.argv[2]);
const rpc = process.argv[3] ?? "https://api.devnet.solana.com";
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8"))));
const provider = new AnchorProvider(new Connection(rpc, "confirmed"), new Wallet(payer), { commitment: "confirmed" });
const program = new Program(JSON.parse(readFileSync(new URL("../idl/line_futures.json", import.meta.url), "utf8")), provider);
const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId);

const existing = await provider.connection.getAccountInfo(config);
if (existing) {
  console.log("already initialized:", config.toBase58());
} else {
  const sig = await program.methods.initialize(settler, 200)
    .accounts({ config, vault, authority: payer.publicKey, systemProgram: SystemProgram.programId }).rpc();
  console.log("initialized", sig);
}
console.log("config", config.toBase58(), "vault", vault.toBase58());
