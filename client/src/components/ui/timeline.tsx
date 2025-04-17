import * as React from "react";
import { cn } from "@/lib/utils";

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative flex flex-col", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Timeline.displayName = "Timeline";

export interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TimelineItem.displayName = "TimelineItem";

export interface TimelineSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TimelineSeparator = React.forwardRef<HTMLDivElement, TimelineSeparatorProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center mr-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TimelineSeparator.displayName = "TimelineSeparator";

export interface TimelineDotProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TimelineDot = React.forwardRef<HTMLDivElement, TimelineDotProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative z-10 flex items-center justify-center w-9 h-9 rounded-full bg-primary-50",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TimelineDot.displayName = "TimelineDot";

export interface TimelineConnectorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TimelineConnector = React.forwardRef<HTMLDivElement, TimelineConnectorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("w-1 bg-neutral-200 grow my-2", className)}
        {...props}
      />
    );
  }
);
TimelineConnector.displayName = "TimelineConnector";

export interface TimelineContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TimelineContent = React.forwardRef<HTMLDivElement, TimelineContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex-grow py-2", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TimelineContent.displayName = "TimelineContent";

export interface TimelineHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TimelineHeader = React.forwardRef<HTMLDivElement, TimelineHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TimelineHeader.displayName = "TimelineHeader";

export interface TimelineTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const TimelineTitle = React.forwardRef<HTMLHeadingElement, TimelineTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h6
        ref={ref}
        className={cn("text-sm font-medium text-neutral-900", className)}
        {...props}
      >
        {children}
      </h6>
    );
  }
);
TimelineTitle.displayName = "TimelineTitle";
