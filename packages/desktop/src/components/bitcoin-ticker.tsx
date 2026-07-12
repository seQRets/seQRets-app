import bitcoinLogo from '@/assets/icons/bitcoin-logo.png';
import { BitcoinTicker as SharedBitcoinTicker } from '@/components/ui/bitcoin-ticker';

export function BitcoinTicker() {
  return (
    <SharedBitcoinTicker
      logo={<img src={bitcoinLogo} alt="Bitcoin Logo" width={40} height={40} />}
    />
  );
}
