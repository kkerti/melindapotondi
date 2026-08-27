import { Button, DetailPageButton, PaginatedListDataTable } from '@vendure/dashboard';
import { Link } from '@tanstack/react-router';
import { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { deleteWorkshopEventDocument, workshopEventListDocument } from './workshop-event.graphql';

interface WorkshopEventTableProps {
    workshopId: string;
}

/**
 * A WorkshopEvent only makes sense in the context of its parent Workshop, so rather than a
 * standalone top-level list route, this is embedded directly on the Workshop detail page,
 * scoped to that Workshop via `transformVariables`. Mirrors the core dashboard's own
 * `CustomerOrderTable` nested-list pattern (see `paginated-list-data-table.tsx`'s JSDoc) -
 * `PaginatedListDataTable` used directly with local pagination/sort/filter state, rather than
 * the full `ListPage` (which renders its own top-level `Page`/breadcrumbs and isn't meant to
 * be embedded inside another page).
 */
export function WorkshopEventTable({ workshopId }: Readonly<WorkshopEventTableProps>) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sorting, setSorting] = useState<SortingState>([{ id: 'startsAt', desc: false }]);
    const [filters, setFilters] = useState<ColumnFiltersState>([]);

    // `to`/`search` are widened past `Link`'s literal-route-id typing since extension routes
    // like `/workshop-events/$id` (with its `?workshopId=` search param) aren't part of the
    // statically-generated, strictly-typed route tree - matching how the core dashboard's own
    // `customer-order-table.tsx` links across routes (`to={`/orders/${id}`}`).
    const newEventHref: string = '/workshop-events/new';

    return (
        <div className="space-y-2">
            <div className="flex justify-end">
                <Button asChild size="sm">
                    <Link to={newEventHref} search={{ workshopId } as any}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        New event
                    </Link>
                </Button>
            </div>
            <PaginatedListDataTable
                listQuery={workshopEventListDocument}
                deleteMutation={deleteWorkshopEventDocument}
                transformVariables={variables => ({
                    ...variables,
                    options: {
                        ...variables.options,
                        filter: { ...variables.options?.filter, workshopId: { eq: workshopId } },
                    },
                })}
                customizeColumns={{
                    location: {
                        header: 'Location',
                        cell: ({ row }) => (
                            <DetailPageButton
                                href={`/workshop-events/${row.original.id}`}
                                label={row.original.location}
                            />
                        ),
                    },
                }}
                page={page}
                itemsPerPage={pageSize}
                sorting={sorting}
                columnFilters={filters}
                onPageChange={(_, newPage, perPage) => {
                    setPage(newPage);
                    setPageSize(perPage);
                }}
                onSortChange={(_, newSorting) => {
                    setSorting(newSorting);
                }}
                onFilterChange={(_, newFilters) => {
                    setFilters(newFilters);
                }}
            />
        </div>
    );
}
