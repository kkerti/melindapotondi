import {
    Button,
    Checkbox,
    DashboardRouteDefinition,
    detailPageRouteLoader,
    DetailFormGrid,
    FormFieldWrapper,
    Input,
    Page,
    PageActionBar,
    PageActionBarRight,
    PageBlock,
    PageLayout,
    PageTitle,
    useDetailPage,
} from '@vendure/dashboard';
import { AnyRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { WorkshopEventTable } from './workshop-event-list';
import { createWorkshopDocument, updateWorkshopDocument, workshopDetailDocument } from './workshop.graphql';

export const workshopDetail: DashboardRouteDefinition = {
    path: '/workshops/$id',
    loader: detailPageRouteLoader({
        queryDocument: workshopDetailDocument,
        breadcrumb: (isNew, entity) => [
            { path: '/workshops', label: 'Workshops' },
            isNew ? 'New workshop' : entity?.title,
        ],
    }),
    component: route => <WorkshopDetailPage route={route} />,
};

// Hand-rolled (rather than the fully-auto `DetailPage` helper used in step 1) so that a
// `PageBlock` for the nested WorkshopEvent list (see workshop-event-list.tsx) can be added
// below the Workshop's own form - `DetailPage` renders a fixed `Page`/`PageLayout` with no
// slot for extra blocks. All fields/widgets below are otherwise unchanged from the previous
// auto-generated form.
function WorkshopDetailPage({ route }: Readonly<{ route: AnyRoute }>) {
    const params = route.useParams();
    const navigate = useNavigate();
    const creatingNewEntity = params.id === 'new';

    const { form, submitHandler, entity, isPending, resetForm } = useDetailPage({
        queryDocument: workshopDetailDocument,
        createDocument: createWorkshopDocument,
        updateDocument: updateWorkshopDocument,
        setValuesForUpdate: w => ({
            id: w.id,
            title: w.title,
            description: w.description,
            slug: w.slug,
            defaultDurationMinutes: w.defaultDurationMinutes,
            defaultCapacity: w.defaultCapacity,
            defaultPriceInCents: w.defaultPriceInCents,
            isActive: w.isActive,
        }),
        params: { id: params.id },
        onSuccess: async data => {
            toast.success(creatingNewEntity ? 'Successfully created workshop' : 'Successfully updated workshop');
            resetForm();
            if (creatingNewEntity) {
                await navigate({ to: `/workshops/${(data as any).id}` });
            }
        },
        onError: err => {
            toast.error(creatingNewEntity ? 'Failed to create workshop' : 'Failed to update workshop', {
                description: err instanceof Error ? err.message : 'Unknown error',
            });
        },
    });

    return (
        <Page pageId="workshop-detail" form={form} submitHandler={submitHandler} entity={entity}>
            <PageTitle>{creatingNewEntity ? 'New workshop' : (entity?.title ?? '')}</PageTitle>
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
                            name="title"
                            label="Title"
                            render={({ field }) => <Input {...field} />}
                        />
                        <FormFieldWrapper
                            control={form.control}
                            name="description"
                            label="Description"
                            render={({ field }) => <Input {...field} value={field.value ?? ''} />}
                        />
                        <FormFieldWrapper
                            control={form.control}
                            name="slug"
                            label="Slug"
                            render={({ field }) => <Input {...field} />}
                        />
                        <FormFieldWrapper
                            control={form.control}
                            name="defaultDurationMinutes"
                            label="Default duration (minutes)"
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
                            name="defaultCapacity"
                            label="Default capacity"
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
                            name="defaultPriceInCents"
                            label="Default price (in cents)"
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
                            name="isActive"
                            label="Active"
                            render={({ field }) => (
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            )}
                        />
                    </DetailFormGrid>
                </PageBlock>
                {!creatingNewEntity && entity && (
                    <PageBlock column="main" blockId="events" title="Events">
                        <WorkshopEventTable workshopId={entity.id} />
                    </PageBlock>
                )}
            </PageLayout>
        </Page>
    );
}
