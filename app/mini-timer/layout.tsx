export const metadata = {
  title: "FocusFlow Mini Timer",
};

export default function MiniTimerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="m-0 p-0 overflow-hidden bg-transparent select-none antialiased">
        {children}
      </body>
    </html>
  );
}
