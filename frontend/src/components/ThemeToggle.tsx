import { Menu } from '@base-ui/react/menu';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '@/lib/theme';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

export const ThemeToggle = () => {
  const { preference, theme, setPreference } = useTheme();
  const Current = theme === 'light' ? Sun : Moon;
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Theme"
        className="pressable grid size-9 place-items-center rounded-xl border border-line text-muted transition-colors duration-150 hover:border-line-strong hover:text-text"
      >
        <Current className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50">
          <Menu.Popup className="popup-scale w-40 rounded-2xl border border-line-strong bg-raised p-1.5 shadow-2xl outline-none">
            <Menu.RadioGroup value={preference} onValueChange={(v) => setPreference(v as ThemePreference)}>
              {OPTIONS.map(({ value, label, Icon }) => (
                <Menu.RadioItem
                  key={value}
                  value={value}
                  className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text/85 outline-none data-[highlighted]:bg-veil/[0.07] data-[highlighted]:text-text"
                >
                  <Icon className="size-4 text-muted" />
                  <span className="flex-1">{label}</span>
                  <Menu.RadioItemIndicator>
                    <Check className="size-3.5 text-go-fg" />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};
