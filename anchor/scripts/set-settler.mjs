// Rotate the settler: only the program authority can do this. Usage: node scripts/set-settler.mjs <new-settler-pubkey> [rpc]
import anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";

const { AnchorProvider, Program, Wallet } = anchor;
const next = new PublicKey(process.argv[2]);
const rpc = process.argv[3] ?? "https://api.devnet.solana.com";
const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8"))));
const provider = new AnchorProvider(new Connection(rpc, "confirmed"), new Wallet(authority), { commitment: "confirmed" });
const program = new Program(JSON.parse(readFileSync(new URL("../idl/line_futures.json", import.meta.url), "utf8")), provider);
const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);

const before = await program.account.config.fetch(config);
console.log("settler before:", before.settler.toBase58());
const sig = await program.methods.setSettler(next).accounts({ config, authority: authority.publicKey }).rpc();
const after = await program.account.config.fetch(config);
console.log("settler after: ", after.settler.toBase58());
console.log("tx", sig);
if (!after.settler.equals(next)) process.exit(1);
