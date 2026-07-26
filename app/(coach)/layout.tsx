import { CoachNav } from '@/components/coach/CoachNav';
import { CoachFooter } from '@/components/coach/CoachFooter';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CoachNav />
      {children}
      <CoachFooter />
    </>
  );
}
