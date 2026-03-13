export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800
                       bg-white/60 dark:bg-slate-900/60
                        backdrop-blur-md
                        ">
      <div className="mx-auto 
                      max-w-7xl 
                      px-4 sm:px-6 md:px-8
                      py-5">
        <div className="flex 
                        flex-col 
                        items-center 
                        justify-between 
                        gap-3 
                        text-xs sm:text-sm 
                        text-slate-600 dark:text-slate-400 
                        sm:flex-row">
          <span className="text-center sm:text-left">&copy; 2026 MyApp</span>
          <span className="text-center sm:text-right">All rights reserved</span>
        </div>
      </div>
    </footer>
  );
}
