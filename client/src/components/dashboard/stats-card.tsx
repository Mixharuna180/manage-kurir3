import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBgColor: string;
  textColor: string;
  linkText?: string;
  linkHref?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  iconBgColor,
  textColor,
  linkText,
  linkHref = "#",
}: StatsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${iconBgColor} rounded-md p-3`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-neutral-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-neutral-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      {linkText && (
        <div className="bg-neutral-50 px-5 py-3">
          <div className="text-sm">
            <a
              href={linkHref}
              className={`font-medium ${textColor} hover:text-primary-500`}
            >
              {linkText}
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}
