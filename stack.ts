import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie", // or "memory"
redirectMethod: {
useNavigate,
}
});