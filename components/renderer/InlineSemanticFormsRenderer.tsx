import {ControlProps, JsonSchema, resolveSchema} from '@jsonforms/core'
import {withJsonFormsControlProps} from '@jsonforms/react'
import {Edit, EditOff} from '@mui/icons-material'
import {FormControl, Grid, Hidden, IconButton} from '@mui/material'
import {JSONSchema7} from 'json-schema'
import merge from 'lodash/merge'
import React, {useCallback, useMemo, useState} from 'react'
import {v4 as uuidv4} from 'uuid'

import {defaultJsonldContext, defaultPrefix, defaultQueryBuilderOptions} from '../form/formConfigs'
import SemanticJsonForm, {CRUDOpsType} from '../form/SemanticJsonForm'
import {uischemaForType} from '../form/uischemaForType'
import {uischemas} from '../form/uischemas'
import {oxigrahCrudOptions} from '../utils/sparql/remoteOxigrapho'
import MuiEditDialog from './MuiEditDialog'

const InlineSemanticFormsRenderer = (props: ControlProps) => {
    const {
        id,
        errors,
        schema,
        uischema,
        visible,
        required,
        config,
        data,
        handleChange,
        path,
        rootSchema,
        label
    } = props
    const isValid = errors.length === 0
    const appliedUiSchemaOptions = merge({}, config, uischema.options)
    const [editMode, setEditMode] = useState(false)
    const [formData, setFormData] = useState({'@id': data})
    const [CRUDOps, setCRUDOps] = useState<CRUDOpsType | undefined>()
    const {load, save, remove } = CRUDOps || {}

    const handleChange_ = useCallback(
        (v?: string) => {
            handleChange(path, v)
        },
        [path, handleChange],
    )

    const handleToggle = useCallback(() => {
        const prefix = schema.title || 'http://ontologies.slub-dresden.de/exhibition/entity#'
        if (!data && !editMode) {
            const newURI = `${prefix}${uuidv4()}`
            handleChange_(newURI)
            console.log({data})
        }
        setEditMode(!editMode)
    }, [schema, data, handleChange_, setEditMode, editMode])

    const {$ref, typeIRI, useModal} = uischema.options?.context || {}

    const subSchema = useMemo(() => {
        if (!$ref) return
        const schema2 = {
            ...schema,
            $ref
        }
        const resolvedSchema = resolveSchema(schema2 as JsonSchema, '', rootSchema as JsonSchema)
        return {
            ...rootSchema,
            ...resolvedSchema
        }
    }, [$ref, schema, rootSchema])

    const handleSave = useCallback(
        async () => {
            if(!save) return
            await save()
            setEditMode(false)
        },
        [save, setEditMode])
    const handleRemove = useCallback(
        async () => {
            if(!remove) return
            await remove()
            setEditMode(false)
        },
        [remove, setEditMode],
    )




    return (
        <Hidden xsUp={!visible}>
            <FormControl
                fullWidth={!appliedUiSchemaOptions.trim}
                id={id}
                variant={'standard'}
                sx={theme => ({marginBottom: theme.spacing(2)})}
            >
                <IconButton onClick={() => handleToggle()}>{editMode ? <EditOff/> : <Edit/>}</IconButton>
                {editMode && subSchema && (
                    useModal ? (
                            <MuiEditDialog
                                title={label || ''}
                                open={editMode}
                                onClose={handleToggle}
                                onCancel={handleToggle}
                                onSave={handleSave}
                                onReload={load}
                                onRemove={handleRemove}>
                                <SemanticJsonForm
                                    data={formData}
                                    hideToolbar={true}
                                    entityIRI={data}
                                    setData={_data => setFormData(_data)}
                                    shouldLoadInitially
                                    typeIRI={typeIRI}
                                    crudOptions={oxigrahCrudOptions}
                                    defaultPrefix={defaultPrefix}
                                    jsonldContext={defaultJsonldContext}
                                    queryBuildOptions={defaultQueryBuilderOptions}
                                    schema={subSchema as JSONSchema7}
                                    jsonFormsProps={{
                                        uischema: uischemaForType(typeIRI),
                                        uischemas: uischemas
                                    }}
                                    onEntityChange={entityIRI => console.log({entityIRI})}
                                    onInit={(crudOps) => setCRUDOps(crudOps)}
                                />
                            </MuiEditDialog>
                        )
                        : (<Grid container alignItems='baseline'>
                            <Grid item flex={'auto'}>
                                <SemanticJsonForm
                                    data={formData}
                                    entityIRI={data}
                                    setData={_data => setFormData(_data)}
                                    shouldLoadInitially
                                    typeIRI={typeIRI}
                                    crudOptions={oxigrahCrudOptions}
                                    defaultPrefix={defaultPrefix}
                                    jsonldContext={defaultJsonldContext}
                                    queryBuildOptions={defaultQueryBuilderOptions}
                                    schema={subSchema as JSONSchema7}
                                    jsonFormsProps={{
                                        uischemas: uischemas
                                    }}
                                    onEntityChange={entityIRI => console.log({entityIRI})}
                                />
                            </Grid>
                        </Grid>))
                }
            </FormControl>
        </Hidden>
    )
}

export default withJsonFormsControlProps(InlineSemanticFormsRenderer)