// This file is part of HFS - Copyright 2021-2023, Massimo Melina <a@rejetto.com> - License https://www.gnu.org/licenses/gpl-3.0.txt
// all content here is shared between client and server

import { PauseCircle, PlayCircle, Refresh, SvgIconComponent } from '@mui/icons-material'
import { SxProps } from '@mui/system'
import { createElement as h, FC, forwardRef, Fragment, ReactNode, useCallback, useState } from 'react'
import { Box, BoxProps, Breakpoint, ButtonProps, CircularProgress, IconButton, IconButtonProps, Link, LinkProps,
    Tooltip, TooltipProps, useMediaQuery } from '@mui/material'
import { formatPerc, isIpLan, isIpLocalHost, prefix, WIKI_URL } from '../../src/cross'
import { dontBotherWithKeys, useBatch, useStateMounted } from '@hfs/shared'
import { Promisable, StringField } from '@hfs/mui-grid-form'
import { alertDialog, confirmDialog, toast } from './dialog'
import { LoadingButton, LoadingButtonProps } from '@mui/lab'
import { Link as RouterLink } from 'react-router-dom'
import { SvgIconProps } from '@mui/material/SvgIcon/SvgIcon'
import _ from 'lodash'
import { ALL as COUNTRIES } from './countries'
import { apiCall } from '@hfs/shared/api'

export function spinner() {
    return h(CircularProgress)
}

// return true if same size or larger
export function useBreakpoint(breakpoint: Breakpoint) {
    return useMediaQuery((theme: any) => theme.breakpoints.up(breakpoint), { noSsr:true }) // without noSsr, first execution always returns false
}

// for debug purposes
export function useLogBreakpoint() {
    const breakpoints = ['xl', 'lg', 'md', 'sm', 'xs'] as const
    console.log('BREAKPOINT', breakpoints[_.findIndex(breakpoints.map(x => useBreakpoint(x)), x => x)])
}

interface IconProgressProps {
    icon: SvgIconComponent,
    progress: number,
    offset?: number,
    sx?: SxProps,
    addTitle?: ReactNode
}
export function IconProgress({ icon, progress, offset, addTitle, sx }: IconProgressProps) {
    return h(Fragment, {},
        h(icon, { sx: { position:'absolute', ml: '4px' } }),
        h(CircularProgress, {
            value: progress * 100 || 0,
            variant: 'determinate',
            size: 32,
            sx: { position: 'absolute' },
        }),
        h(Tooltip, {
            title: h(Fragment, {},
                _.isNumber(progress) ? formatPerc(progress) : "Size unknown",
                addTitle && h('div', {}, addTitle)
            ),
            children: h(CircularProgress, {
                color: 'success',
                value: (offset || 1e-7) * 100,
                variant: 'determinate',
                size: 32,
                sx: { display: 'flex', ...sx }, // workaround: without this the element has 0 width when the space is crammy (monitor/file)
            }),
        })
    )
}

type FlexProps = SxProps & { vert?: boolean, center?: boolean, children?: ReactNode, props?: BoxProps }
export function Flex({ vert=false, center=false, children=null, props={}, ...rest }: FlexProps) {
    return h(Box, {
        sx: {
            display: 'flex',
            gap: '.8em',
            flexDirection: vert ? 'column' : undefined,
            alignItems: vert ? undefined : 'center',
            ...center && { justifyContent: 'center' },
            ...rest,
        },
        ...props
    }, children)
}


export function wikiLink(uri: string, content: ReactNode) {
    if (Array.isArray(content))
        content = dontBotherWithKeys(content)
    return h(Link, { href: WIKI_URL + uri, target: 'help' }, content)
}

export function WildcardsSupported() {
    return wikiLink('Wildcards', "Wildcards supported")
}

export function reloadBtn(onClick: any, props?: any) {
    return h(IconBtn, { icon: Refresh, title: "Reload", onClick, ...props })
}

export function modifiedSx(is: boolean) {
    return is ? { outline: '2px solid' } : undefined
}
interface IconBtnProps extends Omit<IconButtonProps, 'disabled'|'title'|'onClick'> {
    title?: ReactNode
    icon: SvgIconComponent
    disabled?: boolean | string
    progress?: boolean | number
    link?: string
    confirm?: string
    doneMessage?: boolean | string // displayed only if the result of onClick !== false
    tooltipProps?: Partial<TooltipProps>
    onClick: (...args: Parameters<NonNullable<IconButtonProps['onClick']>>) => Promisable<any>
}

export const IconBtn = forwardRef(({ title, icon, onClick, disabled, progress, link, tooltipProps, confirm, doneMessage, sx, ...rest }: IconBtnProps, ref: any) => {
    const [loading, setLoading] = useStateMounted(false)
    if (typeof disabled === 'string')
        title = disabled
    if (link)
        onClick = () => window.open(link)
    disabled = Boolean(loading || progress || disabled)
    let ret: ReturnType<FC> = h(IconButton, {
            ref,
            disabled,
            ...rest,
            sx: { height: 'fit-content', ...sx },
            async onClick(...args) {
                if (confirm && !await confirmDialog(confirm)) return
                const ret = onClick?.apply(this,args)
                if (ret && ret instanceof Promise) {
                    setLoading(true)
                    ret.then(x => x !== false && execDoneMessage(doneMessage), alertDialog).finally(()=> setLoading(false))
                }
            }
        },
        (progress || loading) && progress !== false  // false is also useful to inhibit behavior with loading
        && h(CircularProgress, {
            ...(typeof progress === 'number' ? { value: progress*100, variant: 'determinate' } : null),
            style: { position:'absolute', top: '10%', left: '10%', width: '80%', height: '80%' }
        }),
        h(icon)
    )
    if (disabled)
        ret = h('span', { role: 'button', 'aria-label': title + ', disabled' }, ret)
    if (title)
        ret = h(Tooltip, { title, ...tooltipProps, children: ret })
    return ret
})

interface BtnProps extends Omit<LoadingButtonProps,'disabled'|'title'|'onClick'> {
    icon?: SvgIconComponent
    title?: ReactNode
    disabled?: boolean | string
    progress?: boolean | number
    link?: string
    confirm?: boolean | ReactNode
    labelFrom?: Breakpoint
    doneMessage?: boolean | string // displayed only if the result of onClick !== false
    tooltipProps?: TooltipProps
    onClick?: (...args: Parameters<NonNullable<ButtonProps['onClick']>>) => Promisable<any>
}

export const Btn = forwardRef(({ icon, title, onClick, disabled, progress, link, tooltipProps, confirm, doneMessage, labelFrom, children, ...rest }: BtnProps, ref: any) => {
    const [loading, setLoading] = useStateMounted(false)
    if (typeof disabled === 'string') {
        title = disabled
        disabled = true
    }
    if (link)
        onClick = () => window.open(link)
    const showLabel = useBreakpoint(labelFrom || 'xs')
    let ret: ReturnType<FC> = h(LoadingButton, {
        ref,
        variant: 'contained',
        startIcon: icon && h(icon),
        loading: Boolean(loading || progress),
        loadingPosition: icon && 'start',
        loadingIndicator: typeof progress !== 'number' ? undefined
            : h(CircularProgress, { size: '1rem', value: progress*100, variant: 'determinate' }),
        disabled,
        ...rest,
        children: showLabel && children,
        sx: {
            ...rest.sx,
            ...!showLabel && {
                minWidth: 'auto',
                px: 2,
                py: '7px',
                '& span': { mx:0 },
            }
        },
        async onClick(...args) {
            if (confirm && !await confirmDialog(confirm === true ? "Are you sure?" : confirm)) return
            const ret = onClick?.apply(this,args)
            if (ret && ret instanceof Promise) {
                setLoading(true)
                ret.then(x => x !== false && execDoneMessage(doneMessage), alertDialog)
                    .finally(()=> setLoading(false))
            }
        }
    })
    if (disabled)
        ret = h('span', { role: 'button', 'aria-label': title + ', disabled' }, ret)
    if (title)
        ret = h(Tooltip, { title, ...tooltipProps, children: ret })
    return ret
})

function execDoneMessage(msg: boolean | string | undefined) {
    if (msg)
        toast(msg === true ? "Operation completed" : msg, 'success')
}

export function iconTooltip(icon: SvgIconComponent, tooltip: ReactNode, sx?: SxProps, props?: SvgIconProps) {
    return h(Tooltip, { title: tooltip, children: h(icon, { sx, ...props }) })
}

export function InLink(props:any) {
    return h(Link, { component: RouterLink, ...props })
}

export const Center = forwardRef((props: BoxProps, ref) =>
    h(Box, { ref, display:'flex', height:'100%', width:'100%', justifyContent:'center', alignItems:'center',  flexDirection: 'column', ...props }))

export function LinkBtn({ ...rest }: LinkProps) {
    return h(Link, {
        ...rest,
        href: '',
        sx: { cursor: 'pointer', ...rest.sx },
        role: 'button',
        onClick(ev) {
            ev.preventDefault()
            rest.onClick?.(ev)
        }
    })
}

export function usePauseButton() {
    const [go, btn] = useToggleButton(v => ({
        title: "Pause",
        icon: v ? PauseCircle : PlayCircle,
        sx: { rotate: v ? '180deg' : '0deg' },
    }), true)
    return { pause: !go, pauseButton: btn }
}

export function useToggleButton(iconBtn: (state:boolean) => Omit<IconBtnProps, 'onClick'>, def=false) {
    const [state, setState] = useState(def)
    const toggle = useCallback(() => setState(x => !x), [])
    const props = iconBtn(state)
    const el = h(IconBtn, {
        size: 'small',
        color: state ? 'primary' : 'default',
        'aria-pressed': state,
        ...props,
        sx: { transition: 'all .5s', ...props.sx },
        onClick: toggle,
    })
    return [state, el] as const
}

export const NetmaskField = StringField

export function Country({ code, ip, def, long, short }: { code: string, ip?: string, def?: ReactNode, long?: boolean, short?: boolean }) {
    const good = ip && !isIpLocalHost(ip) && !isIpLan(ip)
    const { data } = useBatch(code === undefined && good && ip2countryBatch, ip, { delay: 100 }) // query if necessary
    code ||= data || ''
    const country = code && _.find(COUNTRIES, { code })
    return !country ? h(Fragment, {}, def) : h(Tooltip, {
        title: long ? undefined : country.name,
        children: h('span', {},
            h('img', {
                className: 'flag icon-w-text',
                src: `flags/${code.toLowerCase()}.png`,
                alt: country.name,
                ...long && { 'aria-hidden': true },
            }),
            long ? country.name + prefix(' (', short && code, ')') : code
        )
    })
}

async function ip2countryBatch(ips: string[]) {
    const res = await apiCall('ip_country', { ips })
    return res.codes as string[]
}
