// src/components/app-sidebar.tsx
'use client';

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChefHat,
  Boxes,
  Factory,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  UtensilsCrossed,
  Wine,
  Flame,
  Package,
  Box,
  CalendarDays,
  CalendarRange,
  Calendar,
  Layers,
  CookingPot,
  ClipboardList,
  LinkIcon,
  Building2,
  ShoppingBag, // ← ADD THIS IMPORT
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2 font-semibold text-sidebar-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="truncate">RestoInventory</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* INVENTORY SECTION */}
        <SidebarGroup>
          <SidebarGroupLabel>Inventory Management</SidebarGroupLabel>
          <SidebarMenu>
            
            {/* Daily Inventory Collapsible */}
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Daily Inventory"
                  isActive={pathname.startsWith("/inventory/daily")}
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>Daily Inventory</span>
                </SidebarMenuButton>

                <CollapsibleTrigger
                  render={
                    <SidebarMenuAction className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Toggle Daily Inventory</span>
                    </SidebarMenuAction>
                  }
                />

                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/daily/kitchen"}
                        render={
                          <Link href="/inventory/daily/kitchen">
                            <UtensilsCrossed className="h-3.5 w-3.5 mr-1" />
                            <span>Kitchen</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>
                    
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/daily/main-stock"}
                        render={
                          <Link href="/inventory/daily/main-stock">
                            <Boxes className="h-3.5 w-3.5 mr-1" />
                            <span>Main Stock (Proteins)</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/daily/bar"}
                        render={
                          <Link href="/inventory/daily/bar">
                            <Wine className="h-3.5 w-3.5 mr-1" />
                            <span>Bar (Fridge & Down)</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/daily/spices"}
                        render={
                          <Link href="/inventory/daily/spices">
                            <Flame className="h-3.5 w-3.5 mr-1" />
                            <span>Spices</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/daily/dry-items"}
                        render={
                          <Link href="/inventory/daily/dry-items">
                            <Package className="h-3.5 w-3.5 mr-1" />
                            <span>Dry Items</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/daily/packaging"}
                        render={
                          <Link href="/inventory/daily/packaging">
                            <Box className="h-3.5 w-3.5 mr-1" />
                            <span>Packaging Items</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {/* Weekly Inventory Summary */}
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Weekly Inventory"
                  isActive={pathname.startsWith("/inventory/weekly")}
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>Weekly Inventory</span>
                </SidebarMenuButton>

                <CollapsibleTrigger
                  render={
                    <SidebarMenuAction className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Toggle Weekly Inventory</span>
                    </SidebarMenuAction>
                  }
                />

                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/weekly/kitchen"}
                        render={
                          <Link href="/inventory/weekly/kitchen">
                            <UtensilsCrossed className="h-3.5 w-3.5 mr-1" />
                            <span>Kitchen</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>
                    
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/weekly/main-stock"}
                        render={
                          <Link href="/inventory/weekly/main-stock">
                            <Boxes className="h-3.5 w-3.5 mr-1" />
                            <span>Main Stock (Proteins)</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/weekly/bar"}
                        render={
                          <Link href="/inventory/weekly/bar">
                            <Wine className="h-3.5 w-3.5 mr-1" />
                            <span>Bar (Fridge & Down)</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/weekly/spices"}
                        render={
                          <Link href="/inventory/weekly/spices">
                            <Flame className="h-3.5 w-3.5 mr-1" />
                            <span>Spices</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/weekly/dry-items"}
                        render={
                          <Link href="/inventory/weekly/dry-items">
                            <Package className="h-3.5 w-3.5 mr-1" />
                            <span>Dry Items</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/weekly/packaging"}
                        render={
                          <Link href="/inventory/weekly/packaging">
                            <Box className="h-3.5 w-3.5 mr-1" />
                            <span>Packaging Items</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {/* Monthly Inventory Summary */}
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Monthly Inventory"
                  isActive={pathname.startsWith("/inventory/monthly")}
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>Monthly Inventory</span>
                </SidebarMenuButton>

                <CollapsibleTrigger
                  render={
                    <SidebarMenuAction className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Toggle Monthly Inventory</span>
                    </SidebarMenuAction>
                  }
                />

                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/monthly/kitchen"}
                        render={
                          <Link href="/inventory/monthly/kitchen">
                            <UtensilsCrossed className="h-3.5 w-3.5 mr-1" />
                            <span>Kitchen</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>
                    
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/monthly/main-stock"}
                        render={
                          <Link href="/inventory/monthly/main-stock">
                            <Boxes className="h-3.5 w-3.5 mr-1" />
                            <span>Main Stock (Proteins)</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/monthly/bar"}
                        render={
                          <Link href="/inventory/monthly/bar">
                            <Wine className="h-3.5 w-3.5 mr-1" />
                            <span>Bar (Fridge & Down)</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/monthly/spices"}
                        render={
                          <Link href="/inventory/monthly/spices">
                            <Flame className="h-3.5 w-3.5 mr-1" />
                            <span>Spices</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/monthly/dry-items"}
                        render={
                          <Link href="/inventory/monthly/dry-items">
                            <Package className="h-3.5 w-3.5 mr-1" />
                            <span>Dry Items</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/monthly/packaging"}
                        render={
                          <Link href="/inventory/monthly/packaging">
                            <Box className="h-3.5 w-3.5 mr-1" />
                            <span>Packaging Items</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {/* Yearly Inventory Summary */}
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Yearly Inventory"
                  isActive={pathname.startsWith("/inventory/yearly")}
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>Yearly Inventory</span>
                </SidebarMenuButton>

                <CollapsibleTrigger
                  render={
                    <SidebarMenuAction className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Toggle Yearly Inventory</span>
                    </SidebarMenuAction>
                  }
                />

                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/yearly/kitchen"}
                        render={
                          <Link href="/inventory/yearly/kitchen">
                            <UtensilsCrossed className="h-3.5 w-3.5 mr-1" />
                            <span>Kitchen</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>
                    
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/yearly/main-stock"}
                        render={
                          <Link href="/inventory/yearly/main-stock">
                            <Boxes className="h-3.5 w-3.5 mr-1" />
                            <span>Main Stock (Proteins)</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/yearly/bar"}
                        render={
                          <Link href="/inventory/yearly/bar">
                            <Wine className="h-3.5 w-3.5 mr-1" />
                            <span>Bar (Fridge & Down)</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/yearly/spices"}
                        render={
                          <Link href="/inventory/yearly/spices">
                            <Flame className="h-3.5 w-3.5 mr-1" />
                            <span>Spices</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/yearly/dry-items"}
                        render={
                          <Link href="/inventory/yearly/dry-items">
                            <Package className="h-3.5 w-3.5 mr-1" />
                            <span>Dry Items</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/inventory/yearly/packaging"}
                        render={
                          <Link href="/inventory/yearly/packaging">
                            <Box className="h-3.5 w-3.5 mr-1" />
                            <span>Packaging Items</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

          </SidebarMenu>
        </SidebarGroup>

        {/* PRODUCTION SECTION */}
        <SidebarGroup>
          <SidebarGroupLabel>Production</SidebarGroupLabel>
          <SidebarMenu>
            
            {/* Daily Production Collapsible */}
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Production"
                  isActive={pathname.startsWith("/production")}
                >
                  <CookingPot className="h-4 w-4" />
                  <span>Production</span>
                </SidebarMenuButton>

                <CollapsibleTrigger
                  render={
                    <SidebarMenuAction className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Toggle Production</span>
                    </SidebarMenuAction>
                  }
                />

                <CollapsibleContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/production/daily"}
                        render={
                          <Link href="/production/daily">
                            <CalendarDays className="h-3.5 w-3.5 mr-1" />
                            <span>Daily Production</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/production/weekly"}
                        render={
                          <Link href="/production/weekly">
                            <CalendarRange className="h-3.5 w-3.5 mr-1" />
                            <span>Weekly Production</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/production/monthly"}
                        render={
                          <Link href="/production/monthly">
                            <Calendar className="h-3.5 w-3.5 mr-1" />
                            <span>Monthly Production</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        isActive={pathname === "/production/yearly"}
                        render={
                          <Link href="/production/yearly">
                            <Layers className="h-3.5 w-3.5 mr-1" />
                            <span>Yearly Production</span>
                          </Link>
                        }
                      />
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            {/* Production Mapping */}
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/production/mapping"}
                tooltip="Production Mapping"
                render={
                  <Link href="/production/mapping">
                    <ClipboardList className="h-4 w-4" />
                    <span>Production Mapping</span>
                  </Link>
                }
              />
            </SidebarMenuItem>

          </SidebarMenu>
        </SidebarGroup>

        {/* SUPPLIERS SECTION */}
        <SidebarGroup>
          <SidebarGroupLabel>Suppliers</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/suppliers"}
                tooltip="Suppliers"
                render={
                  <Link href="/suppliers">
                    <Building2 className="h-4 w-4" />
                    <span>Supplier Accounts</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>



{/* EXPENSES SECTIONs */}
<SidebarGroup>
  <SidebarGroupLabel>Expenses</SidebarGroupLabel>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={pathname === "/expenses"}
        tooltip="Expenses"
        render={
          <Link href="/expenses">
            <ShoppingBag className="h-4 w-4" />
            <span>Expense Management</span>
          </Link>
        }
      />
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarGroup>

        {/* STOCK & PRODUCTION (Original - keep for now) */}
        <SidebarGroup>
          <SidebarGroupLabel>Stock & Transfers</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/stock/transfers"}
                tooltip="Stock Transfers"
                render={
                  <Link href="/stock/transfers">
                    <Factory className="h-4 w-4" />
                    <span>Stock Transfers</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/stock/direct-storage"}
                tooltip="Direct Storage Stock"
                render={
                  <Link href="/stock/direct-storage">
                    <Boxes className="h-4 w-4" />
                    <span>Direct Storage</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* INTEGRATION & REPORTS */}
        <SidebarGroup>
          <SidebarGroupLabel>Sales Integration & Audits</SidebarGroupLabel>
          <SidebarMenu>
            {/* XPS Daily Reconciliation */}
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/xps/daily"}
                tooltip="XPS Daily Reconciliation"
                render={
                  <Link href="/xps/daily">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>XPS Daily Reconciliation</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
            
            {/* XPS Reports - Weekly/Monthly/Yearly */}
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith("/xps/weekly") || pathname.startsWith("/xps/monthly") || pathname.startsWith("/xps/yearly")}
                tooltip="XPS Reports"
                render={
                  <div className="flex items-center gap-2 w-full">
                    <FileBarChart className="h-4 w-4" />
                    <span>XPS Reports</span>
                  </div>
                }
              />
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    isActive={pathname === "/xps/weekly"}
                    render={
                      <Link href="/xps/weekly">
                        <span>Weekly Report</span>
                      </Link>
                    }
                  />
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    isActive={pathname === "/xps/monthly"}
                    render={
                      <Link href="/xps/monthly">
                        <span>Monthly Report</span>
                      </Link>
                    }
                  />
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    isActive={pathname === "/xps/yearly"}
                    render={
                      <Link href="/xps/yearly">
                        <span>Yearly Report</span>
                      </Link>
                    }
                  />
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
            
            {/* XPS Item Mapping */}
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/xps/mapping"}
                tooltip="XPS Item Mapping"
                render={
                  <Link href="/xps/mapping">
                    <LinkIcon className="h-4 w-4" />
                    <span>XPS Item Mapping</span>
                  </Link>
                }
              />
            </SidebarMenuItem>

            {/* XPS Reconciliation Report */}
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/xps/report"}
                tooltip="XPS Reconciliation Report"
                render={
                  <Link href="/xps/report">
                    <FileText className="h-4 w-4" />
                    <span>XPS Report</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
            
            {/* Variance Reports */}
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/reports"}
                tooltip="Discrepancy Reports"
                render={
                  <Link href="/reports">
                    <FileBarChart className="h-4 w-4" />
                    <span>Variance & Flag Reports</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}