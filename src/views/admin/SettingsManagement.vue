<template>
  <div class="settings-page">
    <div class="page-head">
      <h2>系统设置</h2>
      <el-button @click="$router.push('/admin/dashboard')">返回仪表盘</el-button>
    </div>
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
          <el-button size="small" @click="resetAll" :loading="saving">恢复默认</el-button>
        </div>
      </template>

      <el-alert
        v-if="loaded"
        type="info"
        :closable="false"
        show-icon
        title="演示环境说明：设置保存在服务器本地文件，重新部署或容器重启后会恢复默认值。"
        style="margin-bottom: 16px"
      />

      <div v-loading="!loaded">
        <el-tabs v-if="loaded" v-model="activeTab">
          <el-tab-pane
            v-for="group in groups"
            :key="group.name"
            :label="group.label"
            :name="group.name"
          >
            <el-form label-width="140px" class="settings-form">
              <el-form-item v-for="key in group.keys" :key="key" :label="labels[key] || key">
                <el-switch v-if="typeof form[group.name][key] === 'boolean'" v-model="form[group.name][key]" />
                <el-input-number
                  v-else-if="typeof form[group.name][key] === 'number'"
                  v-model="form[group.name][key]"
                  :min="0"
                  controls-position="right"
                />
                <el-input
                  v-else
                  v-model="form[group.name][key]"
                  :type="isSecret(key) ? 'password' : 'text'"
                  :show-password="isSecret(key)"
                  placeholder="（未设置）"
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="saving" @click="saveGroup(group.name)">
                  保存{{ group.label }}
                </el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api/index'

const activeTab = ref('site')
const loaded = ref(false)
const saving = ref(false)
const form = reactive({})

const groups = [
  { name: 'site', label: '基本设置', keys: ['name', 'logo', 'favicon', 'copyright', 'icp', 'seo_keywords', 'seo_description'] },
  { name: 'business', label: '业务设置', keys: ['currency', 'currency_symbol', 'decimal_places', 'tax_rate', 'shipping_fee', 'free_shipping_threshold', 'return_deadline', 'min_order_amount'] },
  { name: 'email', label: '邮件设置', keys: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'from_email', 'from_name'] },
  { name: 'payment', label: '支付设置', keys: ['wechat_pay_enabled', 'wechat_app_id', 'wechat_mch_id', 'wechat_key', 'alipay_enabled', 'alipay_app_id', 'alipay_private_key', 'alipay_public_key'] },
  { name: 'system', label: '运行设置', keys: ['maintenance_mode', 'maintenance_message', 'allow_registration', 'allow_guest_checkout', 'show_out_of_stock', 'low_stock_threshold', 'auto_cancel_unpaid_hours', 'auto_complete_shipped_days'] }
]

const labels = {
  name: '网站名称', logo: 'Logo 地址', favicon: '站点图标', copyright: '版权信息', icp: 'ICP 备案号',
  seo_keywords: 'SEO 关键词', seo_description: 'SEO 描述',
  currency: '货币代码', currency_symbol: '货币符号', decimal_places: '小数位数', tax_rate: '税率',
  shipping_fee: '运费', free_shipping_threshold: '包邮门槛', return_deadline: '退货期限（天）', min_order_amount: '最低订单金额',
  smtp_host: 'SMTP 服务器', smtp_port: 'SMTP 端口', smtp_user: 'SMTP 账号', smtp_pass: 'SMTP 密码',
  from_email: '发件邮箱', from_name: '发件人名称',
  wechat_pay_enabled: '启用微信支付', wechat_app_id: '微信 AppID', wechat_mch_id: '微信商户号', wechat_key: '微信密钥',
  alipay_enabled: '启用支付宝', alipay_app_id: '支付宝 AppID', alipay_private_key: '支付宝私钥', alipay_public_key: '支付宝公钥',
  maintenance_mode: '维护模式', maintenance_message: '维护提示语', allow_registration: '允许注册',
  allow_guest_checkout: '游客结算', show_out_of_stock: '显示缺货商品', low_stock_threshold: '库存预警阈值',
  auto_cancel_unpaid_hours: '未付款自动取消（小时）', auto_complete_shipped_days: '发货自动完成（天）'
}

const isSecret = (key) => /pass|key|secret/i.test(key)

const load = async () => {
  try {
    const res = await api.settings.getSettings()
    const data = res.data || {}
    groups.forEach(g => {
      form[g.name] = { ...(data[g.name] || {}) }
    })
    loaded.value = true
  } catch (e) {
    ElMessage.error('加载设置失败')
  }
}

const saveGroup = async (name) => {
  saving.value = true
  try {
    await api.settings.updateSettings(name, form[name])
    ElMessage.success('已保存')
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const resetAll = async () => {
  saving.value = true
  try {
    await api.settings.resetSettings()
    await load()
    ElMessage.success('已恢复默认设置')
  } catch (e) {
    ElMessage.error('操作失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.page-head h2{margin:0;font-size:22px;color:#303133}
.settings-page {
  padding: 4px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.settings-form {
  max-width: 640px;
}
</style>
