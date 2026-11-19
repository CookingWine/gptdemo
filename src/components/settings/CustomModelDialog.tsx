import { useEffect, useState, type FormEvent } from 'react'
import { useSettings } from '../../hooks/useSettings'
import { Button } from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/Form'
import { Modal } from '../ui/Modal'

export function CustomModelDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, activeModel, addModel } = useSettings()
  const [label, setLabel] = useState('')
  const [modelId, setModelId] = useState('')
  const [providerId, setProviderId] = useState(activeModel.providerId)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLabel('')
    setModelId('')
    setProviderId(activeModel.providerId)
    setDescription('')
    setError('')
  }, [open, activeModel.providerId])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextLabel = label.trim()
    const nextModelId = modelId.trim()

    if (!nextLabel || !nextModelId) {
      setError('显示名与模型 ID 均为必填项')
      return
    }
    const duplicated = settings.models.some(
      (model) =>
        (model.providerId === providerId && model.modelId === nextModelId) ||
        model.label.toLowerCase() === nextLabel.toLowerCase(),
    )
    if (duplicated) {
      setError('已存在相同显示名，或该供应商下已有相同模型 ID')
      return
    }

    addModel({
      label: nextLabel,
      modelId: nextModelId,
      providerId,
      description: description.trim() || undefined,
      tags: [],
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      title="添加自定义模型"
      description="适用于任意 OpenAI 兼容端点。添加后会自动设为当前模型。"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="显示名" hint="用于界面展示">
          <Input
            autoFocus
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="例如：DeepSeek-V3"
            maxLength={40}
          />
        </Field>

        <Field label="所属供应商" hint="决定使用哪个 Base URL 与密钥">
          <Select value={providerId} onChange={(event) => setProviderId(event.target.value)}>
            {settings.providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="模型 ID" hint="请求中透传的 model">
          <Input
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            placeholder="例如：deepseek-chat"
            className="font-mono"
            maxLength={80}
          />
        </Field>

        <Field label="描述" hint="选填">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="简单说明该模型的能力与适用场景"
            rows={3}
            maxLength={160}
          />
        </Field>

        {error ? <p className="text-[11.5px] text-bad">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" size="sm">
            添加并启用
          </Button>
        </div>
      </form>
    </Modal>
  )
}
