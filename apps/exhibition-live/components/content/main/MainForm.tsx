import {Add as NewIcon, Search} from '@mui/icons-material'
import {Button, Container, Grid, IconButton, TextField} from '@mui/material'
import {JSONSchema7} from 'json-schema'
import React, {useCallback, useMemo, useRef, useState} from 'react'
import {SplitPane} from 'react-collapse-pane'
import {v4 as uuidv4} from 'uuid'

import {BASE_IRI} from '../../config'
import ContentMainPreview from '../../content/ContentMainPreview'
import DiscoverAutocompleteInput from '../../form/discover/DiscoverAutocompleteInput'
import {
  defaultJsonldContext,
  defaultPrefix,
  defaultQueryBuilderOptions,
  sladb
} from '../../form/formConfigs'
import SemanticJsonForm from '../../form/SemanticJsonForm'
import {useUISchemaForType} from '../../form/uischemaForType'
import {uischemas} from '../../form/uischemas'
import {useFormRefsContext} from '../../provider/formRefsContext'
import {
  materialCategorizationStepperLayoutWithPortal
} from '../../renderer/MaterialCategorizationStepperLayoutWithPortal'
import {useFormEditor, useOxigraph} from '../../state'
import useExtendedSchema from '../../state/useExtendedSchema'
import {useGlobalCRUDOptions} from '../../state/useGlobalCRUDOptions'
import {useSettings} from '../../state/useLocalSettings'
import SPARQLLocalOxigraphToolkit from '../../utils/dev/SPARQLLocalOxigraphToolkit'

type Props = {
  children: React.ReactChild
  data: any
  classIRI: string
}
const WithPreviewForm = ({classIRI, data, children}: Props) => {
  const isLandscape = false
  const {previewEnabled, togglePreview, formData} = useFormEditor()
  const {features} = useSettings()


  return features?.enablePreview
      ? <>
        <Button onClick={() => togglePreview()} style={{
          zIndex: 100,
          position: 'absolute',
          left: '50%'
        }}>Vorschau {previewEnabled ? 'ausblenden' : 'einblenden'}</Button>
        {previewEnabled
            ? <SplitPane split={isLandscape ? 'horizontal' : 'vertical'}>
              <div className={'page-wrapper'} style={{overflow: 'auto', height: '100%'}}>
                {children}
              </div>
              <div>
                {<ContentMainPreview classIRI={classIRI} exhibition={data}/>}
              </div>
            </SplitPane>
            : children}
      </>
      : <>{children}</>

}
const typeName = 'Exhibition'
const classIRI = sladb.Exhibition.value

export type MainFormProps = {
  defaultData?: any
}
const MainForm = ({defaultData}: MainFormProps) => {
  const [data, setData] = useState<any>(defaultData)
  const {oxigraph} = useOxigraph()
  const {crudOptions, doLocalQuery} = useGlobalCRUDOptions()
  const {features} = useSettings()
  const [searchText, setSearchText] = useState<string | undefined>()
  const [mode, setMode] = useState<'search' | 'edit'>('search')
  const { actionRef, toolbarRef} = useFormRefsContext()

  const handleNew = useCallback(() => {
    setMode('edit')
    const newURI = `${BASE_IRI}${uuidv4()}`
    const newData = {
      '@id': newURI,
      '@type': classIRI,
      'title': searchText
    }
    setData(newData)
  }, [setData, classIRI, searchText])
  const handleChange = useCallback(
      (v?: string) => {
        if (!v) return
        setMode('edit')
        setData((data: any) => ({
          ...data,
          '@id': v,
          '@type': classIRI,
        }))
      }, [setData, classIRI, setMode])
  const handleSearchTextChange = useCallback(
      (searchText: string | undefined) => {
        setSearchText(searchText)
      }, [setSearchText])
  const loadedSchema = useExtendedSchema({typeName, classIRI})
  const uischemaExternal = useUISchemaForType(classIRI)
  const stepperAreaRef = useRef<HTMLDivElement>()
  const actionButtonAreaRef = useRef<HTMLDivElement>()

  const handleChangeData = useCallback((data: any) => {
    setData(data)
  }, [setData])
  const mainFormRenderers = useMemo(() => {
    console.log({stepperAreaRef, actionButtonAreaRef})
    return [
      materialCategorizationStepperLayoutWithPortal(stepperAreaRef.current, actionButtonAreaRef.current)]
  }, [stepperAreaRef.current, actionButtonAreaRef.current])

  return <>
    {mode === 'search' && <Container>
      <Grid container spacing={2}>
        <Grid item xs={11}>
          <DiscoverAutocompleteInput
              typeIRI={classIRI}
              limit={1000}
              condensed
              title={typeName || ''}
              inputProps={
                {
                  placeholder: 'Suche nach Ausstellungen',
                  variant: 'outlined',
                }
              }
              typeName={typeName}
              onDebouncedSearchChange={handleSearchTextChange}
              onSelectionChange={selection => handleChange(selection?.value)}/>
        </Grid>
        <Grid item xs={1}>
          <Button onClick={handleNew} aria-label={'neuen Eintrag erstellen'} startIcon={<NewIcon/>}> neu
            aufnehmen</Button>
        </Grid>
      </Grid>
    </Container>
    }
    {features?.enableDebug &&
        <TextField label={'ID'} value={data['@id']} onChange={e => handleChange(e.target.value)} fullWidth/>}
    {mode === 'edit'
        && <WithPreviewForm data={data} classIRI={classIRI}>
          <Container className="default-wrapper inline_object_card">
            <Grid container spacing={4} direction={'row'}>
              <Grid item xs={2}>
                <div ref={stepperAreaRef}></div>
              </Grid>
              <Grid item xs={10}>

                {oxigraph && features?.enableDebug && <SPARQLLocalOxigraphToolkit sparqlQuery={doLocalQuery}/>}
                <span ref={toolbarRef} />
                <IconButton onClick={handleNew} aria-label={'neuen Eintrag erstellen'}><NewIcon/></IconButton>
                <IconButton
                    onClick={() => setMode('search')}
                    aria-label={'vorhandenen Eintrag suchen'}><Search/>
                </IconButton>
                <span ref={actionRef} />
                {loadedSchema &&
                    <SemanticJsonForm
                        defaultEditMode={ true}
                        data={data}
                        entityIRI={data['@id']}
                        setData={handleChangeData}
                        searchText={searchText}
                        shouldLoadInitially
                        typeIRI={classIRI}
                        crudOptions={crudOptions}
                        defaultPrefix={defaultPrefix}
                        jsonldContext={defaultJsonldContext}
                        queryBuildOptions={defaultQueryBuilderOptions}
                        schema={loadedSchema as JSONSchema7}
                        toolbarChildren={<span ref={actionButtonAreaRef} style={{float: 'right'}}></span> }
                        jsonFormsProps={{
                          uischema: uischemaExternal || (uischemas as any)[typeName],
                          uischemas: uischemas,
                          renderers: mainFormRenderers
                        }}/>
                }
              </Grid>
            </Grid>
          </Container>
        </WithPreviewForm>}
  </>
}

export default MainForm