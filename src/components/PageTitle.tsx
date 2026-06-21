import { useEffect, type ReactNode } from "react";

const appName = "RentSpace";

export function formatPageTitle(title: string) {
  return title === appName ? appName : `${title} | ${appName}`;
}

export default function PageTitle({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = formatPageTitle(title);
  }, [title]);

  return children;
}
