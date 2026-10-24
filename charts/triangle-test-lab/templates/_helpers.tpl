{{- define "triangle-test-lab.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "triangle-test-lab.labels" -}}
app.kubernetes.io/name: {{ include "triangle-test-lab.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
{{- end -}}

{{- define "triangle-test-lab.selectorLabels" -}}
app.kubernetes.io/name: {{ include "triangle-test-lab.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
