import {variable} from '@rdfjs/data-model'
import {SELECT} from '@tpluscode/sparql-builder'
import parse from 'html-react-parser'
import React, {FunctionComponent, useCallback, useEffect, useMemo, useState} from 'react'

import {useSettings} from '../../state/useLocalSettings'
import findEntityByClass from '../../utils/discover/findEntityByClass'
import {defaultQuerySelect} from '../../utils/sparql/remoteOxigraph'
import {AutocompleteSuggestion, DebouncedAutocomplete} from '../DebouncedAutoComplete'
import {defaultPrefix, defaultQueryBuilderOptions} from '../formConfigs'

interface OwnProps {
  selected?: AutocompleteSuggestion | null
  onSelectionChange?: (selection: AutocompleteSuggestion | null) => void
  typeIRI?: string
  title?: string
  readonly?: boolean
  defaultSelected?: AutocompleteSuggestion | null
}

type Props = OwnProps;

const DiscoverAutocompleteInput: FunctionComponent<Props> = ({title = 'etwas', readonly, defaultSelected, selected, onSelectionChange, typeIRI: classType}) => {
  const { activeEndpoint } = useSettings()
  const [ selected__, setSelected__] = useState<AutocompleteSuggestion | null>(selected  || defaultSelected || null)

  const handleChange = useCallback(
      (_e: Event, item: AutocompleteSuggestion | null) => {
        onSelectionChange && onSelectionChange(item)
        setSelected__(item)
      },
      [onSelectionChange, setSelected__],
  )


  return (<>
        <DebouncedAutocomplete
            readOnly={readonly}
            // @ts-ignore
            load={async (searchString) => ((searchString && classType && activeEndpoint?.endpoint)
                ? (await findEntityByClass(searchString, classType, activeEndpoint.endpoint)).map(({name= '', value}) => {
                  return {
                    label: name,
                    value
                  }
                })
                : [])}
            value={selected__}
            placeholder={`Search for ${title} within the current knowledge base`}
            renderOption={(props, option: any) => (
                <li {...props} key={option.value}>
                  {parse(`<span class="debounced_autocomplete_option_label">${option.label}</span>`)}
                </li>
            )}
            // @ts-ignore
            onChange={handleChange}
        />
      </>
  )
}

export default DiscoverAutocompleteInput
