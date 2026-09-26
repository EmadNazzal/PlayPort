import { Accordion } from '@base-ui/react/accordion';
import { Plus } from 'lucide-react';

const QA = [
  { q: 'Which wallets can I use?', a: 'Any Solana wallet that supports the Wallet Standard — Phantom, Solflare, Backpack, Jupiter, and MetaMask’s Solana account among them. Ethereum (0x…) addresses aren’t supported.' },
  { q: 'Do I need a wallet to join?', a: 'No. You can sign up with email and browse or claim free games. You only need a wallet to buy paid games, and you can link one whenever you like.' },
  { q: 'Where does my money go?', a: 'Straight from your wallet to the studio’s payout wallet in a single Solana transfer. PlayPort never takes custody of your funds, and we never ask for your seed phrase.' },
  { q: 'Where do I actually play?', a: 'On the studio’s own site. PlayPort is the market — once a game is in your library, “Play” opens it wherever the studio hosts it.' },
  { q: 'What does it cost in fees?', a: 'The game’s price plus Solana’s network fee, which is usually a fraction of a cent.' },
];

export const Faq = () => (
  <section id="faq" className="mx-auto grid max-w-[1400px] scroll-mt-10 gap-12 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[1fr_1.4fr]">
    <div>
      <p className="eyebrow mb-5">FAQ</p>
      <h2 className="text-[clamp(2.2rem,4.5vw,3.75rem)] leading-[0.95] font-bold tracking-[-0.035em] [font-variation-settings:'wdth'_85]">Questions at the gate.</h2>
    </div>
    <Accordion.Root className="border-b border-line">
      {QA.map(({ q, a }) => (
        <Accordion.Item key={q} className="border-t border-line">
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-medium">
              {q}
              <Plus className="size-5 shrink-0 text-muted transition-transform duration-200 ease-(--ease-out) group-data-[panel-open]:rotate-45" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-250 ease-(--ease-out) data-[ending-style]:h-0 data-[starting-style]:h-0">
            <p className="max-w-xl pb-6 leading-relaxed text-muted">{a}</p>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  </section>
);
