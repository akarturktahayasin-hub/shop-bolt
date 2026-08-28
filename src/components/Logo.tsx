import { ShoppingBag } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { icon: 20, text: 'text-lg', box: 'p-1.5' },
  md: { icon: 26, text: 'text-2xl', box: 'p-2' },
  lg: { icon: 34, text: 'text-3xl sm:text-4xl', box: 'p-2.5' },
};

export default function Logo({ size = 'md' }: LogoProps) {
  const { icon, text, box } = sizeMap[size];

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${box} rounded-xl bg-gradient-to-br from-primary-500 via-secondary-500 to-accent-500 shadow-sm`}
      >
        <ShoppingBag size={icon} className="text-white" strokeWidth={2.25} />
      </div>
      <span className={`${text} font-extrabold tracking-tight text-neutral-800`}>
        ShopMeGo<span className="text-primary-500">.ai</span>
      </span>
    </div>
  );
}
