import { SIGNUP } from "@/lib/terpkings-content";
import { TKSignupForm } from "./TKSignupForm";

/** JOIN THE COURT — newsletter signup (export layout; form posts to /api/subscribe). */
export function TKSignup() {
  return (
    <section
      id="signup"
      className="tk-gutter mx-auto flex max-w-[720px] flex-col items-center gap-4 pb-[100px] text-center"
    >
      <h2
        className="m-0 font-extrabold uppercase text-[#E8F0C8]"
        style={{ fontSize: "clamp(26px, 3.5vw, 38px)" }}
      >
        {SIGNUP.title}
      </h2>
      <p className="tk-mono m-0 text-[20px] leading-[1.5] text-[#8A9E5C]">{SIGNUP.blurb}</p>
      <TKSignupForm />
    </section>
  );
}
