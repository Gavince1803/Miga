import { useColorScheme } from '@/components/useColorScheme';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/Colors';
import { useAlert } from '@/context/AlertContext';
import { useRecipes } from '@/hooks/useRecipes';
import { supabase } from '@/lib/supabase';
import { CostIngredient, RecipeCostConfig, UNIT_OPTIONS } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Print from 'expo-print';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const QUOTE_BANNER_KEY = 'miga_quote_share_announced';

function QuoteFeatureBanner({ colors, onDismiss }: { colors: typeof Colors.light; onDismiss: () => void }) {
    return (
        <View style={[bannerStyles.banner, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}>
            <View style={[bannerStyles.iconBadge, { backgroundColor: colors.primary + '25' }]}>
                <FontAwesome name="whatsapp" size={14} color={colors.primary} />
            </View>
            <Text style={[bannerStyles.text, { color: colors.text }]}>
                <Text style={{ fontWeight: '700' }}>Nuevo: </Text>
                compartí esta cotización por WhatsApp con el botón de abajo
            </Text>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <FontAwesome name="times" size={14} color={colors.textMuted} />
            </TouchableOpacity>
        </View>
    );
}

const bannerStyles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.md,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        gap: Spacing.sm,
    },
    iconBadge: {
        width: 28,
        height: 28,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
});

export default function CostCalculatorScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const params = useLocalSearchParams();
    const { showAlert } = useAlert();

    // State for Recipe Name
    const [recipeName, setRecipeName] = useState(params.recipeName as string || '');
    const recipeId = params.recipeId as string | undefined;
    const recipeImageUrl = params.recipeImageUrl as string | undefined;
    const [saving, setSaving] = useState(false);
    const [showQuoteBanner, setShowQuoteBanner] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(QUOTE_BANNER_KEY).then(val => {
            if (val !== 'true') setShowQuoteBanner(true);
        });
    }, []);

    const dismissQuoteBanner = async () => {
        await AsyncStorage.setItem(QUOTE_BANNER_KEY, 'true');
        setShowQuoteBanner(false);
    };
    const [sharing, setSharing] = useState(false);
    const { updateRecipePrice } = useRecipes();

    // State for Ingredients
    const [ingredients, setIngredients] = useState<CostIngredient[]>([]);
    const [isAddIngredientVisible, setIsAddIngredientVisible] = useState(false);

    // Load initial ingredients from params
    React.useEffect(() => {
        if (params.initialIngredients) {
            try {
                const initial = JSON.parse(params.initialIngredients as string);
                if (Array.isArray(initial)) {
                    setIngredients(initial);
                }
            } catch (e) {
                console.error("Failed to parse initial ingredients", e);
            }
        }
    }, [params.initialIngredients]);

    // New Ingredient Form State
    const [newIngName, setNewIngName] = useState('');
    const [newIngUsed, setNewIngUsed] = useState('');
    const [newIngBought, setNewIngBought] = useState('');
    const [newIngPrice, setNewIngPrice] = useState('');
    const [newIngUnit, setNewIngUnit] = useState('g');
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);

    // State for Config
    const [config, setConfig] = useState<RecipeCostConfig>({
        laborPercentage: 30,
        utilityCost: 0,
        packagingCost: 0,
        wastePercentage: 5,
        profitPercentage: 30,
        portions: 12,
    });

    // Helper to calculate cost for a single ingredient
    const calculateIngredientCost = (ing: CostIngredient) => {
        if (ing.quantityBought === 0) return 0;
        const pricePerUnit = ing.priceBought / ing.quantityBought;
        return pricePerUnit * ing.quantityUsed;
    };

    // Calculate Totals
    const totals = useMemo(() => {
        const ingredientsCost = ingredients.reduce((sum, ing) => sum + calculateIngredientCost(ing), 0);

        // Waste (Merma) is often applied to ingredients cost
        const wasteCost = ingredientsCost * (config.wastePercentage / 100);

        // Labor is often % of ingredients (or fixed, but prompt said % in screenshot analysis)
        // Let's assume % of ingredients + waste for now as per typical bakery logic
        // Or it could be % of TOTAL production cost. 
        // Based on "Casi Trozos" style simplocity, let's apply Labor % to (Ingredients + Waste)
        const productionBase = ingredientsCost + wasteCost;
        const laborCost = productionBase * (config.laborPercentage / 100);

        const subtotal = productionBase + laborCost + Number(config.utilityCost) + Number(config.packagingCost);

        const profitAmount = subtotal * (config.profitPercentage / 100);
        const totalSuggestedPrice = subtotal + profitAmount;
        const pricePerPortion = config.portions > 0 ? totalSuggestedPrice / config.portions : 0;

        return {
            ingredientsCost,
            wasteCost,
            laborCost,
            subtotal, // Total Cost
            profitAmount,
            totalSuggestedPrice,
            pricePerPortion
        };
    }, [ingredients, config]);

    const handleAddIngredient = () => {
        if (!newIngName || !newIngUsed || !newIngBought || !newIngPrice) {
            showAlert({ title: 'Error', message: 'Por favor completa todos los campos del ingrediente', type: 'error' });
            return;
        }

        const quantityUsed = parseFloat(newIngUsed.replace(',', '.'));
        const quantityBought = parseFloat(newIngBought.replace(',', '.'));
        const priceBought = parseFloat(newIngPrice.replace(',', '.'));

        if (
            isNaN(quantityUsed) || quantityUsed < 0 ||
            isNaN(quantityBought) || quantityBought <= 0 ||
            isNaN(priceBought) || priceBought < 0
        ) {
            showAlert({ title: 'Error', message: 'Ingresa valores numéricos válidos (la cantidad comprada debe ser mayor a 0)', type: 'error' });
            return;
        }

        const newIngredient: CostIngredient = {
            id: Date.now().toString(),
            name: newIngName,
            quantityUsed,
            quantityBought,
            priceBought,
            unit: newIngUnit,
        };

        setIngredients([...ingredients, newIngredient]);

        // Reset form
        setNewIngName('');
        setNewIngUsed('');
        setNewIngBought('');
        setNewIngPrice('');
        setIsAddIngredientVisible(false);
    };

    const handleSavePrice = async () => {
        if (!recipeId) {
            showAlert({ title: 'Info', message: 'Este cálculo no está vinculado a una receta guardada.', type: 'info' });
            return;
        }
        setSaving(true);
        const success = await updateRecipePrice(
            recipeId,
            totals.totalSuggestedPrice,
            totals.pricePerPortion
        );
        setSaving(false);
        if (success) {
            showAlert({ title: 'Éxito', message: 'Precio guardado en la receta', type: 'success' });
        }
    };

    const handleShareQuote = async () => {
        setSharing(true);
        try {
            let businessName = 'Miga';
            let phone = '';
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, phone')
                    .eq('id', session.user.id)
                    .single();
                if (profile?.full_name) businessName = profile.full_name;
                if (profile?.phone) phone = profile.phone;
            }

            const issueDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

            const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
<style>
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #FFFBF7; color: #333; }
  .header { padding: 26px 32px 18px; text-align: center; border-bottom: 3px solid #D4A574; }
  .header h1 { margin: 0; font-family: 'Dancing Script', cursive; font-weight: 700; font-size: 40px; color: #B9895F; }
  .header p { margin: 2px 0 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #b9a696; }
  .photo { width: 100%; height: 180px; object-fit: cover; display: block; }
  .body { padding: 24px 32px 28px; }
  .client { font-size: 20px; font-weight: 700; color: #222; margin-bottom: 2px; }
  .issued { font-size: 11px; color: #aaa; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #b9a696; padding-bottom: 8px; border-bottom: 1px solid #f0e8de; }
  th.num, td.num { text-align: right; }
  td { padding: 10px 0; vertical-align: top; font-size: 14px; color: #333; border-bottom: 1px solid #f7f1ea; }
  .price-row { display: flex; justify-content: space-between; align-items: center; background: #fdf3e8; border-radius: 10px; padding: 14px 18px; margin-top: 18px; }
  .price-label { font-size: 13px; color: #a08b6f; font-weight: 600; }
  .price-value { font-size: 26px; font-weight: 700; color: #B9895F; }
  .valid { margin-top: 14px; font-size: 12px; color: #b9895f; text-align: center; }
  .footer { margin-top: 22px; border-top: 1px solid #f0e8de; padding-top: 14px; font-size: 11px; color: #c2b8ab; text-align: center; }
</style>
</head>
<body>
<div class="header">
  <h1>${businessName}</h1>
  <p>Cotización</p>
</div>
${recipeImageUrl ? `<img class="photo" src="${recipeImageUrl}" />` : ''}
<div class="body">
  <div class="client">${recipeName || 'Presupuesto'}</div>
  <div class="issued">Emitida el ${issueDate}</div>
  <table>
    <tr>
      <th>Producto</th>
      <th class="num">Porciones</th>
      <th class="num">Precio/porción</th>
      <th class="num">Total</th>
    </tr>
    <tr>
      <td>${recipeName || 'Presupuesto'}</td>
      <td class="num">${config.portions}</td>
      <td class="num">$${totals.pricePerPortion.toFixed(2)}</td>
      <td class="num">$${totals.totalSuggestedPrice.toFixed(2)}</td>
    </tr>
  </table>
  <div class="price-row">
    <span class="price-label">PRECIO TOTAL</span>
    <span class="price-value">$${totals.totalSuggestedPrice.toFixed(2)}</span>
  </div>
  <div class="valid">Cotización válida hasta el ${validUntil}</div>
  <div class="footer">${phone ? `${phone} · ` : ''}Generado con Miga</div>
</div>
</body>
</html>`;

            const { uri } = await Print.printToFileAsync({
                html,
                base64: false,
                width: 612,
                height: recipeImageUrl ? 700 : 560,
                margins: { top: 0, right: 0, bottom: 0, left: 0 },
            });
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: recipeName || 'Cotización' });
        } catch (err) {
            console.error('Quote share error:', err);
            showAlert({ title: 'Error', message: 'No se pudo generar la cotización', type: 'error' });
        } finally {
            setSharing(false);
        }
    };

    const handleDeleteIngredient = (id: string) => {
        setIngredients(ingredients.filter(i => i.id !== id));
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{
                title: 'Calculadora de Costos',
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
                headerShadowVisible: false,
            }} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    {showQuoteBanner && (
                        <QuoteFeatureBanner colors={colors} onDismiss={dismissQuoteBanner} />
                    )}

                    {/* Header Input */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.text }]}>Nombre de la Receta</Text>
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: colors.surface,
                                color: colors.text,
                                borderColor: colors.border
                            }]}
                            placeholder="Ej. Torta de Chocolate"
                            placeholderTextColor={colors.textMuted}
                            value={recipeName}
                            onChangeText={setRecipeName}
                        />
                    </View>

                    {/* Ingredients Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Ingredientes</Text>
                            <TouchableOpacity onPress={() => setIsAddIngredientVisible(true)}>
                                <Text style={[styles.actionText, { color: colors.primary }]}>+ Agregar</Text>
                            </TouchableOpacity>
                        </View>

                        {ingredients.length === 0 ? (
                            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                                    No hay ingredientes agregados
                                </Text>
                            </View>
                        ) : (
                            ingredients.map((ing) => (
                                <View key={ing.id} style={[styles.ingredientRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.ingredientName, { color: colors.text }]}>{ing.name}</Text>
                                        <Text style={[styles.ingredientDetail, { color: colors.textSecondary }]}>
                                            Uso: {ing.quantityUsed} {ing.unit} | Compra: {
                                                (ing.unit === 'g' && ing.quantityBought >= 1000) ? `${ing.quantityBought / 1000} kg` :
                                                    (ing.unit === 'ml' && ing.quantityBought >= 1000) ? `${ing.quantityBought / 1000} l` :
                                                        `${ing.quantityBought} ${ing.unit}`
                                            } (${ing.priceBought})
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', marginRight: Spacing.sm }}>
                                        <Text style={[styles.ingredientCost, { color: colors.text }]}>
                                            ${calculateIngredientCost(ing).toFixed(2)}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteIngredient(ing.id)} style={{ padding: 4 }}>
                                        <FontAwesome name="trash" size={16} color={colors.error} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Additional Costs Grid */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Costos Adicionales</Text>
                        <View style={styles.gridContainer}>
                            <View style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Mano de Obra (%)</Text>
                                <TextInput
                                    style={[styles.gridInput, { color: colors.text }]}
                                    keyboardType="numeric"
                                    value={config.laborPercentage.toString()}
                                    onChangeText={(t) => setConfig({ ...config, laborPercentage: Math.max(0, parseFloat(t) || 0) })}
                                />
                            </View>
                            <View style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Merma (%)</Text>
                                <TextInput
                                    style={[styles.gridInput, { color: colors.text }]}
                                    keyboardType="numeric"
                                    value={config.wastePercentage.toString()}
                                    onChangeText={(t) => setConfig({ ...config, wastePercentage: Math.max(0, parseFloat(t) || 0) })}
                                />
                            </View>
                            <View style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Servicios ($)</Text>
                                <TextInput
                                    style={[styles.gridInput, { color: colors.text }]}
                                    keyboardType="numeric"
                                    value={config.utilityCost.toString()}
                                    onChangeText={(t) => setConfig({ ...config, utilityCost: Math.max(0, parseFloat(t) || 0) })}
                                />
                            </View>
                            <View style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Empaque ($)</Text>
                                <TextInput
                                    style={[styles.gridInput, { color: colors.text }]}
                                    keyboardType="numeric"
                                    value={config.packagingCost.toString()}
                                    onChangeText={(t) => setConfig({ ...config, packagingCost: Math.max(0, parseFloat(t) || 0) })}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Pricing Config */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Configuración de Precio</Text>
                        <View style={styles.gridContainer}>
                            <View style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Ganancia Deseada (%)</Text>
                                <TextInput
                                    style={[styles.gridInput, { color: colors.text }]}
                                    keyboardType="numeric"
                                    value={config.profitPercentage.toString()}
                                    onChangeText={(t) => setConfig({ ...config, profitPercentage: Math.max(0, parseFloat(t) || 0) })}
                                />
                            </View>
                            <View style={[styles.gridItem, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Porciones</Text>
                                <TextInput
                                    style={[styles.gridInput, { color: colors.text }]}
                                    keyboardType="numeric"
                                    value={config.portions.toString()}
                                    onChangeText={(t) => setConfig({ ...config, portions: Math.max(0, parseFloat(t) || 0) })}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Sticky Summary */}
                <View style={[styles.summaryContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }, Shadows.md]}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Costo Total</Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>${totals.subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ganancia ({config.profitPercentage}%)</Text>
                        <Text style={[styles.summaryValue, { color: colors.success }]}>${totals.profitAmount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRowMain}>
                        <View>
                            <Text style={[styles.summaryMainLabel, { color: colors.textSecondary }]}>Precio Sugerido</Text>
                            <Text style={[styles.summarySubLabel, { color: colors.textMuted }]}>por porción</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.summaryMainValue, { color: colors.primary }]}>${totals.totalSuggestedPrice.toFixed(2)}</Text>
                            <Text style={[styles.summarySubValue, { color: colors.text }]}>${totals.pricePerPortion.toFixed(2)} / ud</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }]}
                        onPress={handleShareQuote}
                        disabled={sharing}
                    >
                        <FontAwesome name="share-alt" size={18} color="#FFF" />
                        <Text style={styles.saveButtonText}>
                            {sharing ? 'Generando...' : 'Compartir Cotización'}
                        </Text>
                    </TouchableOpacity>
                    {recipeId && (
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: colors.success }]}
                            onPress={handleSavePrice}
                            disabled={saving}
                        >
                            <FontAwesome name="save" size={18} color="#FFF" />
                            <Text style={styles.saveButtonText}>
                                {saving ? 'Guardando...' : 'Guardar en Receta'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* Add Ingredient Modal */}
            <Modal
                visible={isAddIngredientVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsAddIngredientVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Agregar Ingrediente</Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, marginBottom: 16 }]}
                            placeholder="Nombre (ej. Harina)"
                            placeholderTextColor={colors.textMuted}
                            value={newIngName}
                            onChangeText={setNewIngName}
                            autoFocus
                        />

                        {/* Quantity & Unit Row */}
                        <View style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Cantidad Usada</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.textMuted}
                                        value={newIngUsed}
                                        onChangeText={setNewIngUsed}
                                    />
                                </View>
                                <View style={{ flex: 1, zIndex: 10 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Unidad</Text>
                                    <TouchableOpacity
                                        style={[styles.input, {
                                            backgroundColor: colors.surface,
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }]}
                                        onPress={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                                    >
                                        <Text style={{ color: colors.text }}>{newIngUnit}</Text>
                                        <FontAwesome name={isUnitDropdownOpen ? "chevron-up" : "chevron-down"} size={12} color={colors.textMuted} />
                                    </TouchableOpacity>

                                    {isUnitDropdownOpen && (
                                        <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                            <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                                {UNIT_OPTIONS.map((opt) => (
                                                    <TouchableOpacity
                                                        key={opt.value}
                                                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                                                        onPress={() => {
                                                            setNewIngUnit(opt.value);
                                                            setIsUnitDropdownOpen(false);
                                                        }}
                                                    >
                                                        <Text style={{ color: colors.text }}>{opt.label} ({opt.value})</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, zIndex: 1 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Cant. Compra ({newIngUnit})</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.textMuted}
                                        value={newIngBought}
                                        onChangeText={setNewIngBought}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Precio Compra ($)</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                                        placeholder="0.00"
                                        keyboardType="numeric"
                                        placeholderTextColor={colors.textMuted}
                                        value={newIngPrice}
                                        onChangeText={setNewIngPrice}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.surface }]}
                                onPress={() => setIsAddIngredientVisible(false)}
                            >
                                <Text style={{ color: colors.text }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={handleAddIngredient}
                            >
                                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Agregar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: Spacing.md,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    label: {
        ...Typography.caption,
        marginBottom: Spacing.xs,
        marginLeft: 4,
    },
    input: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: 'transparent',
        fontSize: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        ...Typography.bodyBold,
        fontSize: 18,
    },
    actionText: {
        ...Typography.body,
        fontWeight: '600',
    },
    emptyState: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
        fontStyle: 'italic',
    },
    ingredientRow: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    ingredientName: {
        ...Typography.bodyBold,
    },
    ingredientDetail: {
        ...Typography.caption,
        marginTop: 2,
    },
    ingredientCost: {
        ...Typography.bodyBold,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    gridItem: {
        flex: 1,
        minWidth: '45%',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    gridLabel: {
        ...Typography.caption,
        marginBottom: 4,
    },
    gridInput: {
        ...Typography.bodyBold,
        fontSize: 18,
        padding: 0,
    },
    summaryContainer: {
        padding: Spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
        borderTopWidth: 1,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        ...Typography.body,
    },
    summaryValue: {
        ...Typography.bodyBold,
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: Spacing.sm,
    },
    summaryRowMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryMainLabel: {
        ...Typography.subtitle,
        fontSize: 20,
    },
    summarySubLabel: {
        ...Typography.caption,
    },
    summaryMainValue: {
        ...Typography.title,
        fontSize: 28,
    },
    summarySubValue: {
        ...Typography.body,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
    },
    modalTitle: {
        ...Typography.subtitle,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.xl,
    },
    modalButton: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    dropdownList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        marginTop: 4,
        zIndex: 1000,
        elevation: 5,
    },
    dropdownItem: {
        padding: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: Spacing.md,
        marginTop: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
});
