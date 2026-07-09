"use client";
"use no memo";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/admin/ui/badge";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { type ColumnDef, flexRender, type Table as TanStackTable } from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin/ui/table";

import { DraggableRow } from "./draggable-row";

interface DataTableProps<TData, TValue> {
  table: TanStackTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  dndEnabled?: boolean;
  onReorder?: (newData: TData[]) => void;
}

function renderRows<TData, TValue>({
  table,
  columns,
  dndEnabled,
  dataIds,
}: {
  table: TanStackTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  dndEnabled: boolean;
  dataIds: UniqueIdentifier[];
}) {
  if (!table.getRowModel().rows.length) {
    return (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-24 text-center">
          No results.
        </TableCell>
      </TableRow>
    );
  }

  if (dndEnabled) {
    return (
      <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
        {table.getRowModel().rows.map((row) => (
          <DraggableRow key={row.id} row={row} />
        ))}
      </SortableContext>
    );
  }

  return table.getRowModel().rows.map((row) => {
    if (row.getIsGrouped()) {
      return (
        <TableRow key={row.id} className="bg-muted/30 hover:bg-muted/40 transition-colors cursor-pointer group" onClick={() => row.toggleExpanded()}>
          <TableCell colSpan={columns.length} className="py-2 px-4 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="size-5 rounded bg-background border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                {row.getIsExpanded() ? (
                  <ChevronRight className="size-3.5 rotate-90 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="size-3.5 transition-transform duration-200" />
                )}
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                {String(row.getValue(row.groupingColumnId!))}
              </span>
              <div className="h-[1px] flex-1 bg-border/40" />
              <Badge variant="outline" className="text-[9px] font-mono opacity-60 bg-background h-5 border-border/50">
                {row.subRows.length} services
              </Badge>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return (
      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="group/row">
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id} className="group-data-[state=selected]/row:bg-primary/5">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    );
  });
}

export function DataTable<TData, TValue>({
  table,
  columns,
  dndEnabled = false,
  onReorder,
}: DataTableProps<TData, TValue>) {
  const dataIds: UniqueIdentifier[] = table.getRowModel().rows.map((row) => Number(row.id) as UniqueIdentifier);
  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id && onReorder) {
      const oldIndex = dataIds.indexOf(active.id);
      const newIndex = dataIds.indexOf(over.id);

      // Call parent with new data order (parent manages state)
      const newData = arrayMove(table.options.data, oldIndex, newIndex);
      onReorder(newData);
    }
  }

  const tableContent = (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-muted">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className="**:data-[slot=table-cell]:first:w-8">
        {renderRows({ table, columns, dndEnabled, dataIds })}
      </TableBody>
    </Table>
  );

  if (dndEnabled) {
    return (
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
        id={sortableId}
      >
        {tableContent}
      </DndContext>
    );
  }

  return tableContent;
}
