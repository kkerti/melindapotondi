import {
    Button,
    Checkbox,
    createRelationSelectorConfig,
    DashboardRouteDefinition,
    DateTimeInput,
    detailPageRouteLoader,
    DetailFormGrid,
    FormFieldWrapper,
    Input,
    LabeledData,
    Page,
    PageActionBar,
    PageActionBarRight,
    PageBlock,
    PageLayout,
    PageTitle,
    SingleRelationInput,
    useDetailPage,
} from '@vendure/dashboard';
import { AnyRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
    createWorkshopEventDocument,
    updateWorkshopEventDocument,
    workshopEventDetailDocument,
    workshopsForSelectorDocument,
} from './workshop-event.graphql';

export const workshopEventDetail: DashboardRouteDefinition = {
    path: '/workshop-events/$id',
    loader: detailPageRouteLoader({
        queryDocument: workshopEventDetailDocument,
        breadcrumb: (isNew, entity) => [
            { path: '/workshops', label: 'Workshops' },
            isNew ? 'New workshop event' : entity?.location,
        ],
    }),
    component: route => <WorkshopEventDetailPage route={route} />,
};

function WorkshopEventDetailPage({ route }: Readonly<{ route: AnyRoute }>) {
    const params = route.useParams();
    // Populated when arriving from the "New event" button on a Workshop's nested event
    // list (see workshop-event-list.tsx), so the parent Workshop can be pre-filled.
    const search = route.useSearch();
    const navigate = useNavigate();
    const creatingNewEntity = params.id === 'new';

    const { form, submitHandler, entity, isPending, resetForm } = useDetailPage({
        queryDocument: workshopEventDetailDocument,
        createDocument: createWorkshopEventDocument,
        updateDocument: updateWorkshopEventDocument,
        setValuesForUpdate: e => ({
            id: e.id,
            workshopId: e.workshop.id,
            startsAt: e.startsAt,
            endsAt: e.endsAt,
            location: e.location,
            capacity: e.capacity,
            priceInCents: e.priceInCents ?? null,
            isPublished: e.isPublished,
        }),
        params: { id: params.id },
        onSuccess: async data => {
            toast.success(creatingNewEntity ? 'Successfully created workshop event' : 'Successfully updated workshop event');
            resetForm();
            if (creatingNewEntity) {
                await navigate({ to: `/workshop-events/${(data as any).id}` });
            }
        },
        onError: err => {
            toast.error(creatingNewEntity ? 'Failed to create workshop event' : 'Failed to update workshop event', {
                description: err instanceof Error ? err.message : 'Unknown error',
            });
        },
    });

    // `setValuesForUpdate` is only invoked once an existing entity has loaded - for a brand
    // new event, the form's defaults come from the mutation's input type instead (see
    // `useGeneratedForm`), so the `?workshopId=` search param from the nested list's
    // "New event" link has to be applied here instead, once, after mount.
    const didPrefillWorkshopId = useRef(false);
    useEffect(() => {
        if (!didPrefillWorkshopId.current && creatingNewEntity && search.workshopId) {
            form.setValue('workshopId', search.workshopId, { shouldDirty: true, shouldValidate: true });
            didPrefillWorkshopId.current = true;
        }
    }, [creatingNewEntity, search.workshopId, form]);

    return (
        <Page pageId="workshop-event-detail" form={form} submitHandler={submitHandler} entity={entity}>
            <PageTitle>{creatingNewEntity ? 'New workshop event' : (entity?.location ?? '')}</PageTitle>
            <PageActionBar>
                <PageActionBarRight>
                    <Button
                        type="submit"
                        disabled={!form.formState.isDirty || !form.formState.isValid || isPending}
                    >
                        {creatingNewEntity ? 'Create' : 'Update'}
                    </Button>
                </PageActionBarRight>
            </PageActionBar>
            <PageLayout>
                <PageBlock column="main" blockId="main-form">
                    <DetailFormGrid>
                        <FormFieldWrapper
                            control={form.control}
                            name="workshopId"
                            label="Workshop"
                            render={({ field }) => (
                                <SingleRelationInput
                                    {...field}
                                    config={createRelationSelectorConfig({
                                        listQuery: workshopsForSelectorDocument,
                                        idKey: 'id',
                                        labelKey: 'title',
                                        placeholder: 'Search workshops...',
                                    })}
                                />
                            )}
                        />
                        <FormFieldWrapper
                            control={form.control}
                            name="startsAt"
                            label="Starts at"
                            render={({ field }) => <DateTimeInput {...field} />}
                        />
                        <FormFieldWrapper
                            control={form.control}
                            name="endsAt"
                            label="Ends at"
                            render={({ field }) => <DateTimeInput {...field} />}
                        />
                        <FormFieldWrapper
                            control={form.control}
                            name="location"
                            label="Location"
                            render={({ field }) => <Input {...field} />}
                        />
                        <FormFieldWrapper
                            control={form.control}
                            name="capacity"
                            label="Capacity"
                            render={({ field }) => (
                                <Input
                                    type="number"
                                    value={field.value ?? ''}
                                    onChange={e => field.onChange(e.target.valueAsNumber)}
                                />
                            )}
                        />
                        <FormFieldWrapper
                            control={form.control}
                            name="priceInCents"
                            label="Price override (in cents)"
                            description="Optional - overrides the workshop's default price for this occurrence. Leave blank to use the workshop default."
                            render={({ field }) => (
                                <Input
                                    type="number"
                                    value={field.value ?? ''}
                                    onChange={e =>
                                        field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)
                                    }
                                />
                            )}
                        />
                        <FormFieldWrapper
                            control={form.control}
                            name="isPublished"
                            label="Published"
                            render={({ field }) => (
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            )}
                        />
                    </DetailFormGrid>
                </PageBlock>
                {!creatingNewEntity && entity && (entity.productId || entity.productVariantId) && (
                    <PageBlock column="side" blockId="provisioning" title="Auto-provisioned product">
                        <div className="space-y-2">
                            {entity.productId && <LabeledData label="Linked product ID" value={entity.productId} />}
                            {entity.productVariantId && (
                                <LabeledData label="Linked product variant ID" value={entity.productVariantId} />
                            )}
                        </div>
                    </PageBlock>
                )}
            </PageLayout>
        </Page>
    );
}
