"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

export interface Category {
  id: string;
  tenDanhMuc: string;
  danhMucCon?: Category[];
}

interface CategoryHoverMenuProps {
  categories: Category[];
  value?: string;
  onChange: (categoryId: string) => void;
}

export function CategoryHoverMenu({
  categories,
  value,
  onChange,
}: CategoryHoverMenuProps) {
  // Find selected category name and parent
  const getSelectedInfo = () => {
    if (!value) return { label: "Tất cả danh mục", parentId: null };
    
    for (const parent of categories) {
      if (parent.id === value) {
        return { label: parent.tenDanhMuc, parentId: null };
      }
      const child = parent.danhMucCon?.find((c) => c.id === value);
      if (child) {
        return { label: child.tenDanhMuc, parentId: parent.id };
      }
    }
    return { label: "Tất cả danh mục", parentId: null };
  };

  const selectedInfo = getSelectedInfo();
  const isParentActive = (parentId: string) => parentId === value || parentId === selectedInfo.parentId;

  return (
    <div className="relative">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="h-10 px-3 data-[state=open]:bg-accent">
              <span className="flex items-center gap-2">
                <span className="text-sm">{selectedInfo.label}</span>
              </span>
            </NavigationMenuTrigger>
            <NavigationMenuContent className="w-[400px]">
              <div className="grid gap-1 p-2">
                {/* "All categories" option */}
                <NavigationMenuLink
                  onClick={() => onChange("all")}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    !value && "bg-accent/50"
                  )}
                >
                  <span className="text-sm font-medium">Tất cả danh mục</span>
                  {!value && <Check className="h-4 w-4" />}
                </NavigationMenuLink>

                {/* Divider */}
                <div className="my-1 h-px bg-border" />

                {/* Parent Categories */}
                {categories.map((parent) => {
                  const hasChildren = parent.danhMucCon && parent.danhMucCon.length > 0;
                  const isActive = isParentActive(parent.id);

                  return (
                    <div key={parent.id} className="group/parent">
                      {/* Parent Item */}
                      <NavigationMenuLink
                        onClick={() => onChange(parent.id)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive && "bg-accent/50 font-medium",
                          hasChildren && "group-hover/parent:bg-accent/30"
                        )}
                      >
                        <span className="text-sm">{parent.tenDanhMuc}</span>
                        <div className="flex items-center gap-1">
                          {value === parent.id && <Check className="h-4 w-4" />}
                          {/* Only show arrow if has children */}
                          {hasChildren && (
                            <ChevronDown className="h-4 w-4 rotate-270 text-muted-foreground" />
                          )}
                        </div>
                      </NavigationMenuLink>

                      {/* Children Items */}
                      {hasChildren && (
                        <div className="mt-1 ml-4 space-y-1 hidden group-hover/parent:block">
                          {parent.danhMucCon?.map((child) => (
                            <NavigationMenuLink
                              key={child.id}
                              onClick={() => onChange(child.id)}
                              className={cn(
                                "flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer transition-colors",
                                "hover:bg-accent hover:text-accent-foreground",
                                value === child.id && "bg-primary/10 text-primary font-medium"
                              )}
                            >
                              <span className="text-sm">{child.tenDanhMuc}</span>
                              {value === child.id && <Check className="h-4 w-4" />}
                            </NavigationMenuLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
