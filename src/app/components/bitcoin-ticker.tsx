
'use client';

import Image from 'next/image';
import { BitcoinTicker as SharedBitcoinTicker } from '@/components/ui/bitcoin-ticker';

export function BitcoinTicker() {
  return (
    <SharedBitcoinTicker
      logo={<Image src="/icons/Bitcoin Logo.png" alt="Bitcoin Logo" width={40} height={40} data-ai-hint="bitcoin logo" />}
    />
  );
}
