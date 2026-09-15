import { h, clear } from "../dom";
import { STRINGS } from "../strings/ja";
import type { Router } from "../router";

export function renderLegalPage(outlet: HTMLElement, _router: Router): void {
  clear(outlet);

  const contact = STRINGS.legal.contact;

  outlet.appendChild(
    h("a", { href: "#/" }, [STRINGS.legal.backToApp]),
  );
  outlet.appendChild(h("h2", {}, [STRINGS.legal.title]));

  outlet.appendChild(
    h("section", { className: "card" }, [
      h("h3", {}, [STRINGS.legal.termsHeading]),
      h(
        "ul",
        {},
        STRINGS.legal.terms.map((item) => h("li", {}, [item])),
      ),
    ]),
  );

  outlet.appendChild(
    h("section", { className: "card" }, [
      h("h3", {}, [STRINGS.legal.disclaimerHeading]),
      h(
        "ul",
        {},
        STRINGS.legal.disclaimer.map((item) => h("li", {}, [item])),
      ),
    ]),
  );

  outlet.appendChild(
    h("section", { className: "card" }, [
      h("h3", {}, [STRINGS.legal.contactHeading]),
      h("dl", { className: "legal-contact-list" }, [
        h("dt", {}, [contact.brand]),
        h("dd", {}, [contact.brandValue]),
        h("dt", {}, [contact.address]),
        h("dd", {}, [contact.addressValue]),
        h("dt", {}, [contact.phone]),
        h("dd", {}, [contact.phoneValue]),
        h("dt", {}, [contact.email]),
        h("dd", {}, [contact.emailValue]),
        h("dt", {}, [contact.web]),
        h("dd", {}, [h("a", { href: contact.webValue, target: "_blank", rel: "noopener" }, [contact.webValue])]),
        h("dt", {}, [contact.x]),
        h("dd", {}, [contact.xValue]),
        h("dt", {}, [contact.github]),
        h("dd", {}, [contact.githubValue]),
      ]),
    ]),
  );
}
